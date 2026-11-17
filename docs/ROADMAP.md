# micci-os Roadmap

Living list of what's next. **Start every new session here**, then read the
linked issue. One session per workstream; close the issue (and update this
file) when it ships. Detailed context lives in each GitHub issue.

Last updated: Nov 15, 2026 · Live at https://os.brandonmicci.com

**Current plan:** the Nov 2026 audit and four-phase game plan
(https://claude.ai/artifact/9qum9yf3PeqAtsXmd3DSZs). Phase 1 (lock down)
shipped in PR #69; Phase 2 (clean slate) is in progress; Phase 3 is the
daily log at `/today`; Phase 4 is hardening, then the feature queue below.

## How we work
- **One repo, one session per feature.** Open a fresh Claude Code session,
  point it at an issue ("work on #34"), it reads `CLAUDE.md` → this file →
  the issue → the PRD.
- **Branch → PR → Brandon approves merge.** Vercel deploys `main`.
- **Data rules** (CLAUDE.md): Supabase is the source of truth, nothing is
  overwritten silently, records are marked paid/closed — never deleted.
- **Security:** Google SSO + authenticator code everywhere
  (`docs/SECURITY.md`). Machine endpoints must be explicitly exempted in
  `src/proxy.ts` and verify their own secret/signature.
- After shipping something that changes how data arrives, update
  `docs/DATA_REFRESH_LOG.md`.

## 1 · Waiting on Brandon
| Item | Unblocks |
|---|---|
| **Supabase → Authentication:** turn off "Allow new users to sign up", disable the Email provider if unused, delete the unused email login (created Mar 8), turn on leaked-password protection | Closes the open-RLS risk from the audit |
| Add repo secret `BRANDONMICCI_WEB_SUPABASE_ANON_KEY`, then merge **PR #68** (keep-alive) | Stops brandonmicci-web pause warnings |
| Merge **PR #71** (`/finance/plan` on plan v17) and close **PR #67**, which it replaces | Master Plan page shows the agreed plan |
| `/financial` → Debt Payoff → **✓ Mark paid** on Chase Freedom Unlim BT3 (expired Oct 9) and any other paid promo; update or mark paid the 14 manual debts last edited May–Jul | Accurate debt list and runway |
| `/tasks`: clear the 4 overdue action items (26 open) | Clean Action Center |
| Confirm the first Schwab payday (assumed Nov 30) | Runway and cash-gap dates |
| Pause the claude.ai **Markets** Routine (replaced by the Grok bot); say whether the **Home** (last Oct 31) and **Health** (last Nov 2) briefs are moving to Grok or should be hidden | Briefs hub shows only live tabs |
| Connect **CUTX** (HELOC), **Wealthfront**, **401k provider** in `/import`; Plaid → *Add details* on **Amex** and **BofA** | Live HELOC/savings/retirement balances, statement findings (#32) |
| Send **dad loan** details (balance, rate, payment, pay day) and explain the **BofA −$13,000** deposit on Sep 9 | Debt list, #39 |
| Send the daily-tracking "full MD" | Phase 3 daily log fields |
| Register **WHOOP** + **Withings** developer apps, add their env vars | #34, #35 |
| Create **Postmark** account (inbound server) | #33 |
| Supabase SQL editor: delete the test brief `delete from briefs where doc_key = '2000-01-01-test';` | Clean briefs history |
| Confirm whether the 5 manual weigh-ins (Feb 24–Mar 8, 198→195 lb) are real | Weight trend accuracy |

## 2 · Testing (live verification)
Tracked in **#32 — Post-deploy verification checklist**: statements pipeline,
live debt overlay, SSO + MFA, os.brandonmicci.com bank linking, daily
check-in, Health Overview, lab + InBody uploads, Labs tab.

Automated coverage: `npm test` (Vitest, `tests/`) runs on every PR via
GitHub Actions. It covers the logic behind #32 (debt overlay tags,
statement → promo findings, SSO/MFA gate, check-in upsert, Overview,
lab grouping + dates). What still needs a live click-through is listed
in #32.

## 3 · Build queue
Suggested order — top first. Audit items have no issue number yet.

| # | Item | Area | Blocked on |
|---|---|---|---|
| audit | Phase 2: runway cash-gap fix, docs refresh, `/job-search` redirect, Grok pilot removal | platform | **PR in review** |
| audit | Phase 3: `/today` daily log (top 3 actions, evening check-in, streak), dashboard freshness dots, weekly KPIs from daily rows | platform | the "full MD" helps |
| audit | Dashboard job feed and Job Search pulse read the old `job_pipeline` table; move them to `/pipeline` data | platform | — |
| audit | Tests for `txnAggregate` (burn, categories), `recurring`, HELOC, paycheck, tax; CI lint + build + coverage | platform | — |
| audit | Supabase cleanup migration: per-user RLS, merge duplicate policies, index foreign keys | platform | Brandon's approval to apply |
| audit | Replace `xlsx` (no patched npm release); vitest 3 → 5 | platform | — |
| audit | Encrypt Plaid access tokens (Vault) | platform | — |
| audit | `loading.tsx` / `error.tsx`, simpler nav | design | — |
| #54 | Mobile-first layouts for every page | design | — |
| #42 | Claude connector OAuth (retire secret URL; also fixes the 60s GET timeouts) | platform | — |
| #41 | Claude connector: health + labs tools | platform | — |
| #39 | Recategorize CUTX HELOC draws as Transfer | finance | BofA $13K answer (partial) |
| #40 | Data sources page + one connector pattern | platform | best after #34/#35 |
| #38 | Subscription checker | finance | — |
| #33 | Email lab import (Postmark) + auto-save uploads with undo | health | Postmark account |
| #34 | WHOOP integration | health | WHOOP dev app |
| #35 | Withings integration | health | Withings dev app |
| #36 | Workout log | health | — |
| #37 | Meal prep / food plans | health | scoping chat |
| #43 | Forward micci-os.vercel.app → os.brandonmicci.com | platform | #32 sign-off |

## 4 · Shipped (recent)
| PR | What |
|---|---|
| #69 | Security: Next.js 16.4.6, owner check in every server page, guarded import (allowlist, typed Replace confirm) |
| #63–66 | Calculators (debt payoff, car, 401(k), bills, lease vs buy), plan as data, 2026 Tax Center, live Cash Flow plan, HELOC tracker fixes, working Scenarios |
| #47–50 | Vitest suite + CI, overdue promos (#44), MCP tool registry, single briefs hub at `/briefs` |
| #31 | Health: daily check-in, Overview, lab + InBody uploads, 583 real lab results, grouped Labs tab |
| #30 | Live bank balances in debts (Live/Manual/Stale); Google SSO + TOTP MFA; security headers |
| #29 | Statements pipeline (Plaid Statements → Claude → reviewed promo findings) |
| #27–28 | Plaid Liabilities + Investments; *Add details* update mode |
| — | os.brandonmicci.com custom domain (Oct 20) |
| earlier | Briefs hub, Micci Finance MCP connector, Southwest job in runway, finance intake |

## Key docs
`CLAUDE.md` (rules) · `docs/CLAUDE.md` (structure) · `docs/SECURITY.md` ·
`docs/DATA_REFRESH_LOG.md` · `docs/MCP_CONNECTOR.md` · `docs/MCP_LAYER_PROPOSAL.md` ·
`docs/prds/07-HEALTH-DATA.md` · `docs/TRUEUP_PHASE1_AUDIT.md` ·
`docs/FINANCE_INTAKE.md`
