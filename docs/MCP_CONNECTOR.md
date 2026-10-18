# Micci OS — Claude MCP connector

Read-only finance + briefs tools for any Claude chat, served by micci-os at
`/api/mcp/<MICCI_MCP_TOKEN>` (Streamable HTTP, stateless, MCP TypeScript SDK v2).
Every number comes from the same code as `/financial` (`getFinancialData()` →
`src/lib/finance/*`). No tool writes anything.

Code: `src/lib/mcp/server.ts` (tools) · `src/app/api/mcp/[token]/route.ts`
(route + token check) · `src/proxy.ts` (`/api/mcp/` exempt from the session gate).

## Setup (one time)
1. Vercel → micci-os → Settings → Environment Variables → add
   `MICCI_MCP_TOKEN` (Production, type Sensitive) = a random 64-hex string
   (`openssl rand -hex 32`). Under 32 chars, the route refuses everything.
2. Redeploy production (env changes apply on the next deploy).
3. claude.ai → Settings → Connectors → Add custom connector →
   URL `https://micci-os.vercel.app/api/mcp/<token>`, no OAuth.

**Security model:** the full URL is a password (anyone with it can read the
finance summaries). Rotate by changing `MICCI_MCP_TOKEN` + redeploying, then
updating the connector URL. Wrong tokens get a plain 404. Upgrade path: OAuth
(the SDK's `requireBearerAuth` + an authorization server) if the connector is
ever shared beyond Brandon's own Claude account.

## Tools
| Tool | Answers |
|---|---|
| `micci_financial_snapshot` | Where do I stand: cash, runway / job-income projection, real spend, net worth, debts, HELOC, portfolio, next deadlines |
| `micci_search_transactions` | Find charges by merchant / category / dates / amount (paged) |
| `micci_spending_by_category` | Category totals for a period vs the previous period |
| `micci_recurring_charges` | Subscriptions & bills, price changes, lapsed services |
| `micci_debts` | Every debt with APR/min, 0% promo expirations, HELOC limit |
| `micci_job_offers` | Offers compared: net per check/month, taxes, cash low point, surplus |
| `micci_project_runway` | What-if: spend change, one-time cash in/out, different offer or payday |
| `micci_portfolio` | Positions, gains, weights, targets |
| `micci_briefs` | Latest Micci Daily briefs (today, jobs, markets, health, home) |
| `micci_action_items` | Open to-dos + upcoming bills/promos |
