# Proposal — Should Micci OS put an MCP layer between its data feeds?

**Status:** proposal for review · Oct 26, 2026
**Related:** #40 (data sources + connector pattern), #41 (health + labs connector tools), #42 (connector OAuth), `docs/MCP_CONNECTOR.md`, `docs/DATA_REFRESH_LOG.md`

## TL;DR

**No MCP between the feeds and Supabase. Yes to MCP as the single way any
Claude reads from or writes to Micci OS.**

Inbound feeds (Plaid, Yahoo prices, uploads, WHOOP and Withings later) should
keep calling vendor SDKs from server code and writing to Supabase, using the
connector pattern from #40. Routing them through MCP would add a hop, a second
auth surface and a second failure mode, and no model sits in that path to
benefit from it.

Where MCP does pay off is on the AI side, and there are already three separate
AI paths into the data today. The plan is to merge them into one tool layer
(`src/lib/mcp/`) that serves:

1. the external Claude connector, which already exists,
2. the in-app AI Chat, which currently gets raw table dumps, and
3. the claude.ai Routines, which currently write briefs through the
   all-access Supabase connector.

## 1 · How data moves today

### Inbound feeds (vendor → Supabase)

| Feed | Path | Trigger | Code |
|---|---|---|---|
| Chase ×6 + Amex ×2 transactions, balances, liabilities, investments | Plaid SDK → `transactions`, `debt_accounts`, … | Vercel cron daily 11:00 UTC + *Sync now* | `src/lib/plaid.ts`, `/api/plaid/sync` |
| Statements (promo findings) | Plaid Statements → Claude parse → review queue | Same sync run | `src/lib/statements.ts` |
| Portfolio prices | `yahoo-finance2` → `portfolio_positions` | Vercel cron weekdays 21:00 UTC | `/api/investments/refresh-prices` |
| CSV / document import | Upload → parse + dedup → tables; text → pgvector chunks | Manual | `/api/import`, `/api/process-document` |
| Labs + InBody | Upload → Claude extraction → review → `lab_markers`, `body_metrics` | Manual | `/api/health/documents`, `src/lib/healthDocs.ts` |
| Check-ins, goals, planner, job pipeline, perks | In-app CRUD | Manual | the matching `/api/*` routes |
| Daily briefs | 7 claude.ai Routines → `upsert_brief()` SQL | Routine schedules | Supabase connector (postgres role), `20261015_briefs_hub.sql` |
| *Planned:* WHOOP, Withings, lab email (Postmark) | OAuth / webhook → health tables | — | #34, #35, #33 |

### AI reads (Supabase → a model)

| Consumer | How it gets data | Problem |
|---|---|---|
| **Claude connector** (`/api/mcp/<token>`) | 10 read-only tools over `getFinancialData()` and `lib/finance/*` | Finance and briefs only, with secret-URL auth (#41, #42) |
| **In-app AI Chat** (`/api/chat`) | `getStructuredContext()` dumps raw JSON from `debt_accounts`, `subscriptions`, `budget_categories`, `supplements`, … plus RAG chunks. No tools | It never sees the live derivations: runway, transaction-derived spend, recurring detection, labs. So it can contradict `/financial` and the connector on the same question |
| **Routines** | Arbitrary SQL through the Supabase connector | Each brief prompt runs as postgres. That is broader than the one `upsert_brief()` call it needs, and it skips the app's finance math |

## 2 · Options

| | A. Keep as-is | B. MCP between feeds and DB | **C. MCP as the AI boundary (recommended)** |
|---|---|---|---|
| Inbound feeds | unchanged | each vendor wrapped as an MCP server the app calls | unchanged, standardized by #40 connectors |
| AI chat | raw table dumps | unchanged | calls the same tools in-process |
| Routines | Supabase SQL | unchanged | narrow `micci_*` write tools |
| Answers agree across surfaces | no | no | **yes, one code path** |
| New moving parts | none | many (servers, auth, transport per feed) | small (tool registry + OAuth) |

**Why not B.** MCP is a protocol for models to discover and call tools. Plaid
syncs, price pulls and webhook ingests are deterministic server jobs with no
model in the loop, and they already have typed SDKs. Putting MCP in the middle
would mean running or hosting extra servers, adding JSON-RPC hops inside a
60-second Vercel function, and debugging two layers when a sync fails. The
problems you actually see with feeds are staleness and silent failures (for
example the `CRON_SECRET` 401s that froze data at Jul 24). That is fixed by #40's
`status / lastSyncAt / staleAfter`, not by a transport.

There is one narrow exception. If a vendor only offers data through an MCP
server (Function Health, for example, is reachable as a Claude connector but
not from the app today), a Routine can read that MCP server and write the results in
through a Micci write tool (step 4 below). That way the vendor's MCP feeds
Micci without the app depending on it.

## 3 · Target shape (option C)

```
 vendors ──SDK/webhook──▶ src/lib/connectors/<feed>/  ──▶ Supabase ◀── in-app UI
   (Plaid, Yahoo, WHOOP…)   connect · sync · status        (RLS)
                                                              │
                                     src/lib/readmodels/*  ◀──┘  getFinancialData, health, labs, briefs
                                              │
                                  src/lib/mcp/tools/*  (one registry: zod schema + handler + readOnly flag)
                         ┌────────────────────┼────────────────────────┐
              /api/mcp (OAuth, #42)    /api/chat (in-process,      Routines (via the
              claude.ai connector      AI SDK tools)               Micci connector, write tools)
```

Rules:
- **One tool registry.** Each tool is `{ name, description, input (zod), handler, readOnly }`. The MCP server registers them, and the chat route adapts the same objects to AI SDK `tool()`s. No HTTP hop in-app.
- **Tools call read models, never raw tables.** Read models wrap `getFinancialData()` and `lib/finance/*` today, and health/labs next. Components and tools both use them, which keeps rule #2 in `CLAUDE.md` intact.
- **Writes are narrow and named.** `micci_upsert_brief`, `micci_mark_tweak_applied`, later `micci_log_checkin`. Each one validates its input with zod and calls one RPC or upsert. No generic SQL tool.
- **Writes need OAuth (#42).** The secret URL stays read-only until it is retired.

## 4 · Migration sketch

Each step ships on its own and can be reverted on its own.

| Step | Change | Size | Done when |
|---|---|---|---|
| 1 | Split `src/lib/mcp/server.ts` (450 lines) into `src/lib/mcp/tools/{finance,briefs,actions}.ts` + `registry.ts`. Behavior unchanged | S | Connector answers are byte-identical |
| 2 | **#41**: add `micci_health_overview`, `micci_labs`, `micci_body_composition`, plus `micci_data_status` (reads #40's feed status, or `DATA_REFRESH_LOG` cadences until #40 lands) | M | Claude can answer "what's out of range on my last draw?" and "what's stale?" |
| 3 | **In-app chat on tools**: `/api/chat` passes the registry as AI SDK tools (`streamText({ tools, maxSteps })`), keeps RAG for documents, and drops the finance and health parts of `getStructuredContext()` | M | The chat's runway and spend numbers match `/financial` |
| 4 | **#42 OAuth** on `/api/mcp`, tied to `lib/auth/owner.ts`, then retire `MICCI_MCP_TOKEN` | M | Connector re-added with OAuth; old URL returns 404 |
| 5 | **Routine write tools**: `micci_upsert_brief`, `micci_mark_tweak_applied` (write-scoped). Point the 7 Routine prompts at them (`docs/prds/06-DAILY-BRIEFS-PROMPTS.md`) and then remove the Supabase connector from those Routines | S | Briefs land with no Supabase connector attached |
| 6 | **#40 connectors** for inbound feeds (Plaid, prices, then WHOOP/Withings as they arrive). This is independent of steps 1–5 and only feeds `micci_data_status` | L | `/settings/data-sources` is green; Overview shows stale feeds |

Suggested order: 1 → 2 → 3 gives the fastest visible win (one consistent
AI). 4 must land before 5. Step 6 follows the WHOOP/Withings work.

## 5 · Risks and open questions

- **Chat latency.** Tool calls add round trips. Mitigations: keep the 5-second context cap, allow 3 tool steps at most, and pre-load the snapshot tool on `/financial`.
- **Token cost.** Tools return compact markdown (`CHARACTER_LIMIT` 25K) instead of `JSON.stringify` dumps, so this should go down.
- **Routine auth.** claude.ai Routines need to reach the OAuth-protected connector. Confirm that before step 5. If they can't, keep the Supabase connector but restrict it to a role that can only `EXECUTE upsert_brief`.
- **Decision for Brandon:** should the chat keep a raw-SQL escape hatch for ad-hoc questions? Recommendation is **no**. Add a tool when a question recurs.
