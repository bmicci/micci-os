# micci-os Roadmap

Living list of what's next. **Start every new session here**, then read the
linked issue. One session per workstream; close the issue (and update this
file) when it ships. Detailed context lives in each GitHub issue.

Last updated: Oct 26, 2026 · Live at https://os.brandonmicci.com

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
| Plaid → *Add details* on **Amex** and **BofA** (grants statements + card terms) | Statement findings, BofA BT promo terms (#32) |
| Connect **CUTX** (HELOC), **Citi Best Buy**, **Wealthfront**, **401k provider** in `/import` | Live HELOC/savings/retirement balances |
| Send **dad loan** details (balance, rate, payment, pay day) and explain the **BofA −$13,000** deposit on Sep 9 | Debt list, #39 |
| Plaid allowed redirect URIs: re-add `https://micci-os.vercel.app/import` if the old address should keep linking banks | Bank linking on vercel.app |
| Vercel env: remove or update `PLAID_REDIRECT_URI` if present | Bank linking on os.brandonmicci.com |
| Register **WHOOP** + **Withings** developer apps, add their env vars | #34, #35 |
| Create **Postmark** account (inbound server) | #33 |
| Supabase SQL editor: delete the test brief `delete from briefs where doc_key = '2000-01-01-test';` | Clean briefs history |
| claude.ai Routines: enable auto-approve for the Health Daily Plan routine | Health brief runs unattended |
| After PR #46 merges: `/financial` → Debt Payoff → **✓ Mark paid** on the 5 promos past expiry (Chase Prime Jul 22, Freedom BT1 Aug 12, Freedom Unlim BT2 Sep 9, Freedom BT2 Sep 12, Freedom Unlim BT3 Oct 9). Live card balances say they're paid. Also close or reschedule the 3 overdue action items in `/tasks` | #44 close-out |
| Confirm whether the 5 manual weigh-ins (Feb 24–Mar 8, 198→195 lb) are real | Weight trend accuracy |

## 2 · Testing (live verification)
Tracked in **#32 — Post-deploy verification checklist**: statements pipeline,
live debt overlay, SSO + MFA, os.brandonmicci.com bank linking, daily
check-in, Health Overview, lab + InBody uploads, Labs tab.

## 3 · Build queue
Suggested order — top first.

| # | Item | Area | Blocked on |
|---|---|---|---|
| #44 | Overdue items render overdue; close paid promos | finance | **PR #46 in review** |
| #39 | Recategorize CUTX HELOC draws as Transfer | finance | BofA $13K answer (partial) |
| #33 | Email lab import (Postmark) + auto-save uploads with undo | health | Postmark account |
| #41 | Claude connector: health + labs tools | platform | — |
| #34 | WHOOP integration | health | WHOOP dev app |
| #35 | Withings integration | health | Withings dev app |
| #40 | Data sources page + one connector pattern | platform | best after #34/#35 |
| #36 | Workout log | health | — |
| #37 | Meal prep / food plans | health | scoping chat |
| #38 | Subscription checker | finance | — |
| #42 | Claude connector OAuth (retire secret URL) | platform | — |
| #43 | Forward micci-os.vercel.app → os.brandonmicci.com | platform | #32 sign-off |

## 4 · Shipped (recent)
| PR | What |
|---|---|
| #31 | Health: daily check-in, Overview, lab + InBody uploads, 583 real lab results, grouped Labs tab |
| #30 | Live bank balances in debts (Live/Manual/Stale); Google SSO + TOTP MFA; security headers |
| #29 | Statements pipeline (Plaid Statements → Claude → reviewed promo findings) |
| #27–28 | Plaid Liabilities + Investments; *Add details* update mode |
| — | os.brandonmicci.com custom domain (Oct 20) |
| earlier | Briefs hub, Micci Finance MCP connector, Southwest job in runway, finance intake |

## Key docs
`CLAUDE.md` (rules) · `docs/CLAUDE.md` (structure) · `docs/SECURITY.md` ·
`docs/DATA_REFRESH_LOG.md` · `docs/MCP_CONNECTOR.md` ·
`docs/prds/07-HEALTH-DATA.md` · `docs/TRUEUP_PHASE1_AUDIT.md` ·
`docs/FINANCE_INTAKE.md`
