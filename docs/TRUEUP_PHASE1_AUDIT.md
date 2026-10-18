# True-Up — Phase 1 Connector Audit
**Date:** Oct 18, 2026 · Responds to the "Data True-Up and Connector Setup" handoff (Oct 17).
**Scope:** read-only audit. No data was changed. Sources: live Supabase tables,
`src/lib/plaid.ts`, Plaid link-token config, transaction history, MCP connector.

## Bottom line
1. **Plaid already returns live balances for all 8 linked accounts** (6 cards,
   checking, IRA) every day — but the debts view and the MCP read `debt_accounts`,
   a hand-maintained table last edited **Jun 12 – Jul 7**. That's why the app is wrong.
2. **The HELOC is being drawn to cover living expenses**: $33,000 of CUTX transfers
   into checking Jun 26 → Oct 14 ($24,500 after the Jul 7 balance update), none
   repaid. Estimated drawn ≈ **$177K, headroom ≈ $13K** (app shows $152K / $37.5K).
   Those draws are also mis-categorized as *Income*.
3. **The five past-due promos were paid** (Chase payments from checking on the
   expiry dates, funded by those HELOC draws). AmEx Gold/Platinum are paid in full
   monthly from checking — the $4.5K + $4.5K "revolving @ 27.49%" rows are stale.
4. **Savings is being drawn down** (Wealthfront → checking transfers of $2–3K,
   ~10 since late June), so the manual $12,187 is likely high.

## Connector status
| Connector | Status | Detail |
|---|---|---|
| Plaid — Transactions | ✅ working | 2 Items (Chase, Amex), both `active`, last sync Oct 17 11:32 UTC via daily cron. 8 accounts: Chase checking 5332, Chase cards 1329 / 4628 / 7117 / 9313, Chase IRA 3509, Amex Gold 5007, Amex Platinum 3002 |
| Plaid — Balance | ✅ working (implicitly) | Sync calls `/accounts/balance/get` for every account → `accounts.balance` + daily `balance_snapshots` since Sep 27. Only *checking* flows into the app (assets.cash); card + IRA balances are stored but unused |
| Plaid — Liabilities | ❌ not enabled | Link token requests `products: [Transactions]` only. No APRs, minimums, statement balances or due dates from Plaid. Plaid covers credit cards (Chase, Amex, Citi) and mortgages; **not** HELOCs or personal loans |
| Plaid — Investments | ❌ not enabled | IRA 3509 arrives as a balance only ($166,237.55). Holdings = 16 imported positions (`portfolio_positions`, prices refreshed daily, lots from CSV). Employer plan never imported |
| Not linked at all | — | Citi (Diamond 4205, Best Buy 4802, Custom Cash 9498), Wealthfront savings, Credit Union of Texas HELOC, BofA mortgage, Virginia FCU loan, employer 401k |
| Supabase | ✅ | RLS on everywhere. Debts = `debt_accounts` (manual). Promos = `promo_deadlines` (manual, all `active`, last edit Jun 12). `accounts` holds the 8 live Plaid rows **plus 31 stale March seed rows** (several look like placeholders: "Apple Card", "Capital One Venture", "Car Loan — Toyota", student loans) — not read by /financial, left untouched |
| Vercel | ✅ crons / ⚠ env list not visible to me | Plaid sync cron (daily 11:00 UTC) and price cron run. My token can't list or create production env vars; Plaid vars evidently present (sync works). `MICCI_MCP_TOKEN` set and working |
| Micci Finance MCP | ✅ live | All 10 tools reachable from Claude. They read the same stale tables, so they inherit every issue above until Phase 2–5 land |

## Reconciliation (Plaid filled where available; baseline = Brandon from lender sites)
| Account | App shows (`debt_accounts`, manual) | Plaid now (Oct 17) | Evidence / note | Baseline |
|---|---|---|---|---|
| Checking 5332 | $3,247.08 | $3,247.08 | ✅ match | |
| Savings (Wealthfront) | $12,187 (manual) | not linked | ~$27K moved Wealthfront → checking since Jun 24 | TBD |
| CU of Texas HELOC drawn | $152,473.32 (Jul 7) | not linked | +$24,500 draws after Jul 7, no repayments seen → **≈ $176,973** | TBD |
| AmEx Gold 5007 | $4,519 @ 27.49% | $2,373.75 | Paid in full monthly from checking ($3,494 Jul 9, $3,040 Aug 10, $2,729 Sep 10, $2,180 Oct 10). Plaid = current cycle charges | TBD (believed $0 revolving) |
| AmEx Platinum 3002 | $4,514 @ 27.49% | $3,849.77 | Same pattern ($3,344 Jun 28 … $2,953 Sep 27) | TBD (believed $0 revolving) |
| Chase Freedom Unlimited 7117 | $13,409.34 @ 0% | $3,574.00 | Paid $8,300 Jul 5, $2,400 Sep 9, $7,000 Oct 9 (BT2, BT3) | TBD |
| Chase Freedom 4628 | $12,876 @ 0% | $2,723.94 | Paid $7,131 Aug 11 (BT1), $2,600 Sep 9 (BT2) | TBD |
| Chase Prime Visa 9313 | $1,398 @ 0% | $2,148.33 | Autopay; promo row Jul 22 still open | TBD |
| Chase 1329 | not in debts | $0.00 | | — |
| Citi Diamond 4205 | $11,999 (debts) / $11,879 (action item) | not linked | promo to Jun 18, 2027 | TBD |
| Citi Best Buy 4802 | $917.96, $311.74 deferred at risk (debts) / $860.40, $342.12 (action item) | not linked | expires Dec 27, 2026 | TBD |
| Virginia FCU loan | $18,500 @ 8.5% | not linked | | TBD |
| BofA mortgage | $495,643.35 @ 3.38% | not linked | | TBD |
| Chase IRA 3509 | $164,404 (positions) | $166,237.55 | $1.8K gap = cash/price timing; Plaid balance is authoritative | — |
| Employer plan | $29,467 supplement (manual) | not linked | | TBD |

## Other findings
- **Mis-categorized income**: CUTX HELOC draws ($33K) and a `BOA CS DIRECT DEP` −$13,000 on Sep 9 are categorized *Income*. Burn/runway exclude income so they're unaffected, but the Money In vs Out chart overstates income. The BofA $13K needs an explanation (refund? cash-out?).
- **Overdue action items still `active`**: Chase Prime promo (Jul 22), Chase Freedom BT1 (Aug 12), unemployment exhaust (Oct 10). All 9 promo rows are `active`, 5 with past expiry dates.
- The runway's liquid cash excludes HELOC headroom (correct/conservative), but with ~$13K headroom the HELOC is no longer a meaningful backstop.

## Proposed next steps (need a go-ahead)
**No-login fixes (I can do now):**
1. Debts view + MCP prefer the live Plaid balance for the 6 linked cards, showing both values when they disagree with the manual row (no silent overwrite); add `source` / `last_synced_at` to `debt_accounts` and `promo_deadlines`.
2. Staleness: manual balances >14 days old flagged in `/financial` and `micci_financial_snapshot`; past-due items render as **overdue**, not "next up".
3. Recategorize CUTX transfers as *Transfer* (HELOC draw) at import and retroactively.

**Needs Brandon:**
4. Baseline column from lender sites: HELOC drawn, Wealthfront, Citi ×2, Virginia FCU, mortgage, employer plan. Then I update the manual rows and close the paid promos (mark `paid`, never delete).
5. Plaid re-link in update mode to add **Liabilities** (APRs/minimums/due dates for Chase + Amex) and **Investments** (IRA holdings), and a new Link for **Citi** (+ BofA mortgage via Liabilities). I build the flow; you click through the bank logins.
6. Confirm the BofA −$13,000 deposit on Sep 9.
