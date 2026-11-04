-- Data reconciliation, 2026-11-04 (owner-confirmed numbers; nothing is deleted:
-- sold positions are zeroed, paid/closed accounts are marked, never removed).
-- Sources: CUTX HELOC screens + transaction history (11/4), Chase app + IRA
-- positions export (11/3), Prime Visa statement 10/25, Citi Best Buy and PayPal
-- Credit screens (11/3-4), VACU loan balance, JPMC 401(k) screens, lender home
-- estimate, and Brandon's confirmations in chat. Idempotent: safe to re-run.

-- ── Debts (manual rows; live Plaid balances still override where linked) ─────
update debt_accounts set balance = 185718.40, interest_rate = 6.85, minimum_payment = 974.31, updated_at = now(),
  notes = 'CUTX HELOC (variable). Limit $190,000, available $4,281.60 (11/4/2026). Interest + some principal; est. payoff $187,450.12. Rate per CUTX 11/4.'
  where name = 'Credit Union of Texas HELOC';
update debt_accounts set balance = 17481.27, interest_rate = 8.5, updated_at = now() where name = 'Virginia FCU Loan (via Dad)';
update debt_accounts set balance = 660.40, minimum_payment = 29.00, updated_at = now(),
  notes = 'Deferred-interest promo ends 12/27/2026. Balance per Citi 11/3; AutoPay $50 on 11/27.' where name = 'Citi Best Buy (4802)';
update debt_accounts set updated_at = now(),
  notes = 'Keep — paid in full each month, nothing carried (owner-confirmed 11/4/2026). APR applies only if a balance is carried.'
  where name in ('AmEx Gold Card (5007)', 'AmEx Platinum Card (3002)');
update debt_accounts set status = 'closed', updated_at = now(),
  notes = coalesce(notes || ' · ', '') || 'Closed at $0 — confirmed by owner 2026-11-04.'
  where name in ('VACU Personal Loan', 'Best Buy Visa (5498)', 'Best Buy Visa (8498)', 'Best Buy Visa (1498)', 'Citi Custom Cash (9498)')
    and coalesce(balance, 0) = 0 and status <> 'closed';

-- ── Promo deadlines ─────────────────────────────────────────────────────────
-- Prime Visa (…9313): statement 10/25 "Qualified Promotional Financing" table (true remaining balances)
update promo_deadlines set status = 'paid', updated_at = now(), verified_at = now(), verified_source = 'statement 2026-10-25 (Chase Prime Visa): plan no longer listed'
  where id in ('22be09bc-d126-477e-969e-6e2ad92978b5', 'da0c1586-f522-4691-9935-427af363ad28');
update promo_deadlines set balance = 191.22, updated_at = now(), verified_at = now(), verified_source = 'statement 2026-10-25 (Chase Prime Visa)', note = 'Equal Pay plan; min $95.61/mo.' where id = 'bf28963f-625c-4f89-9ca2-306d904b8a28';
update promo_deadlines set balance = 268.08, updated_at = now(), verified_at = now(), verified_source = 'statement 2026-10-25 (Chase Prime Visa)', note = 'Equal Pay plan; min $53.63/mo.' where id = 'aba4cbaa-872d-4eb3-8996-78a304826779';
update promo_deadlines set balance = 118.57, updated_at = now(), verified_at = now(), verified_source = 'statement 2026-10-25 (Chase Prime Visa)', note = 'Equal Pay plan; min $23.72/mo.' where id = 'cc5dae35-b906-41b6-8924-7626560e415a';
update promo_deadlines set balance = 374.36, updated_at = now(), verified_at = now(), verified_source = 'statement 2026-10-25 (Chase Prime Visa)', note = 'Equal Pay plan; min $41.60/mo.' where id = 'da07b886-15ce-4200-a6c9-95199cceebad';
-- Freedom (…4628): single promo row; the whole card balance is the promo
update promo_deadlines set balance = 2723.94, updated_at = now(), verified_at = now(), verified_source = 'Chase app 2026-11-03 + statement 2026-10-12 (single 0% row; no other balances)', note = 'Pay from HELOC / cash before 12/12/2026.' where id = '4f9382e4-54f1-4967-9037-c51307bc6289';
-- Freedom Unlimited (…7117): per-promo balances NOT known (statement prints daily-balance averages)
update promo_deadlines set updated_at = now(), verified_at = null, verified_source = null,
  note = 'UNVERIFIED balance: statement prints daily-balance averages ($6,446.73 / $3,985.80); card total is $3,574.00 (Chase app 2026-11-03). Confirm per-promo split on the Nov 9 statement. Plan to clear the whole card before 12/9.'
  where id in ('e686a2b5-76c7-4ab2-bcda-dd5a73005213', 'f3e41600-d6cd-43ac-b1d4-1b71ce1b3ad3');
-- Citi Best Buy (4802)
update promo_deadlines set balance = 660.40, updated_at = now(), verified_at = now(), verified_source = 'Citi 2026-11-03 (statement 11/2)',
  note = 'Deferred-interest at risk: $312 figure is from an earlier statement — confirm on the 11/2 statement. Pay off before 12/27.' where id = '859ea490-9e26-4205-a89a-8a6e09d347dd';
-- Citi Diamond BT: card balance (live) 11,411.00 after the $115 payment
update promo_deadlines set balance = 11411.00, updated_at = now(), verified_at = now(), verified_source = 'Plaid card balance 2026-11-03 / statement 2026-10-16' where id = '39928caf-4e05-4bae-9694-bf8fc6bc1ba8';

-- New: BofA cash advance 11/4 (0% to Oct 2027, 4% fee) and PayPal Credit plans
insert into promo_deadlines (name, account_name, balance, expires, deferred_interest, status, note, verified_at, verified_source)
select 'BofA BankAmericard — cash advance (0%)', 'Bank of America BankAmericard Platinum Plus ···1205', 6240.00, date '2027-10-18', null, 'active',
  'Cash advance $6,000 on 2026-11-04, 0% until Oct 2027, 4% fee ($240). UNVERIFIED: fee assumed added to the balance; end date assumed same as the existing BT (10/18/2027). Plaid shows it once BofA posts it.',
  null, null
where not exists (select 1 from promo_deadlines where name = 'BofA BankAmericard — cash advance (0%)');
insert into promo_deadlines (name, account_name, balance, expires, deferred_interest, status, note, verified_at, verified_source)
select v.name, 'PayPal Credit Card ···0646', v.bal, v.exp, null, 'active', 'No interest if paid in full by the date (deferred interest). APR not shown on the PayPal screen.', now(), 'PayPal Credit app 2026-11-04'
from (values ('PayPal Credit — Frontgate', 331.51, date '2027-01-04'),
             ('PayPal Credit — PayPal purchase', 134.54, date '2027-02-04'),
             ('PayPal Credit — AXS', 23.58, date '2027-02-04')) as v(name, bal, exp)
where not exists (select 1 from promo_deadlines p where p.name = v.name);

-- ── Positions: Chase self-directed IRA (…3509) per 2026-11 export ─────────────
-- current_value, unrealized_gl and unrealized_gl_pct are generated columns (shares * price) — not written
insert into portfolio_positions (account, ticker, name, theme, shares, unit_cost, cost_basis, current_price, is_cash, updated_at)
select 'IRA-3509', v.t, v.t, coalesce(v.th, 'Other'), v.sh, v.uc, v.cb, v.pr, v.t = 'CASH', now()
from (values
  ('QQQ',  58.50704, 384.0758, 22471.14, 685.28, 40093.70, 17622.56, 78.42, null::text),
  ('VTI',  81.15602, 340.6516, 27645.93, 371.15, 30121.06, 2475.13, 8.95, null),
  ('SMH',  52.96341, 393.7003, 20851.71, 518.52, 27462.59, 6610.88, 31.70, null),
  ('PAVE', 182.58817, 54.8706, 10018.72, 54.815, 10008.57, -10.15, -0.10, null),
  ('SPHQ', 106.95799, 84.1452, 9000.00, 83.365, 8916.55, -83.45, -0.93, 'Quality'),
  ('XLV',  47.02286, 170.13, 8000.00, 184.04, 8654.09, 654.09, 8.18, 'Healthcare'),
  ('SRVR', 301, 31.0644, 9350.39, 27.98, 8421.98, -928.41, -9.93, null),
  ('SHLD', 126.46622, 63.9582, 8088.55, 63.41, 8019.22, -69.33, -0.86, null),
  ('VYM',  41.134, 148.5615, 6110.93, 163.26, 6715.54, 604.61, 9.89, null),
  ('XBI',  33.09276, 156.3786, 5175.00, 154.95, 5127.72, -47.28, -0.91, 'Biotech'),
  ('ROBO', 63.16733, 71.2394, 4500.00, 74.66, 4716.07, 216.07, 4.80, null),
  ('VXUS', 53.88081, 84.0572, 4529.07, 82.25, 4431.70, -97.37, -2.15, null),
  ('VOLT', 57, 35.4398, 2020.07, 34.74, 1980.18, -39.89, -1.97, null),
  ('CASH', 13.94, 1, 13.94, 1, 13.94, 0, 0, null),
  ('DIA',  0.00755, 520.5298, 3.93, 517, 3.90, -0.03, -0.76, null)
) as v(t, sh, uc, cb, pr, val, gl, pct, th)
on conflict (ticker) do update set account = 'IRA-3509', shares = excluded.shares, unit_cost = excluded.unit_cost,
  cost_basis = excluded.cost_basis, current_price = excluded.current_price, updated_at = now();
-- Positions no longer held (not in the export): zeroed, kept for history
update portfolio_positions set shares = 0, cost_basis = 0, day_change = 0, day_change_pct = 0, updated_at = now()
  where account = 'IRA-3509' and ticker in ('NUKZ', 'ITA', 'DTCR', 'BOTZ');

-- ── Settings: assets, income model, offers, property tax ─────────────────────
update financial_settings set updated_at = now(), value = value
  || jsonb_build_object('savings', 1148.92, 'home_market', 877723, 'vehicles', 8000,
                        'retirement_employer', 29554.67, 'retirement', 194241.48)
  where key = 'assets';
update financial_settings set updated_at = now(), value = value
  || jsonb_build_object('consulting_monthly_net', 0, 'target_total_comp', 300000,
                        'liquid_cash', 3424.76, 'new_job_monthly_net', 13868)
  where key = 'income_bridge';
update financial_settings set updated_at = now(), value = value
  || jsonb_build_object('taxes_paid', false, 'pay_by', '2026-12-31', 'plan_amount', 15000)
  where key = 'property_tax';
update financial_settings set updated_at = now(), value = '[
  {"id":"southwest","kind":"hourly","status":"declined","employer":"Southwest","title":"Contract-to-hire (via agency)",
   "startDate":"2026-11-02","employment":"w2","hourlyRate":120,"hoursPerWeek":40,"firstPayday":"2026-11-13",
   "filingStatus":"single","payFrequency":26,"healthPremiumPerCheck":0,"contribution401kAnnual":0,
   "notes":"Fell through (Nov 2026). Kept for reference."},
  {"id":"schwab","kind":"salary","status":"accepted","employer":"Charles Schwab",
   "title":"Director, Legal Operating Model, AI & Transformation","annualSalary":240000,"bonusPct":25,
   "startDate":"2026-11-16","employment":"w2","firstPayday":"2026-11-30","filingStatus":"single","payFrequency":26,
   "healthPremiumPerCheck":78,"contribution401kAnnual":12000,
   "notes":"Offer accepted, no sign-on. ASSUMED (confirm with HR): start Mon 11/16, BIWEEKLY pay, first check ~11/30 (may be partial). Benefits start day 1: UHC Premier HSA $66 + Cigna Core $9 + VSP $3 = $78 per check in 24 of 26 checks; 401(k) 5% pre-tax ($12,000/yr) with 5% match + $250. 25% bonus target ($60K) is discretionary; first realistic payout Feb-Mar 2028, none in 2026/2027. Source: Schwab_Compensation_Benefits_Reference.md (2026-11-03)."}
]'::jsonb where key = 'job_offers';

-- ── Action Center: close what is done/obsolete, add what matters now ────────
update action_items set status = 'done', completed_at = now(), updated_at = now()
  where id in ('d0025ca8-77a0-4910-8138-5c469a66bb1c', 'af91573c-eecf-4164-bc51-5ffb6da95f2d',
               'd4e84605-1790-48e8-93dc-5d1b0fbcc479', 'a75d9c28-e852-4e5e-8d04-11fc0ec92d5c') and status = 'active';
update action_items set status = 'dismissed', updated_at = now(),
  detail = 'Obsolete (2026-11-04): AmEx Gold/Platinum are paid in full each month with no promo, so there is nothing to roll.'
  where id = '2a84dfb2-00bb-4295-8d72-3c4ee0af8a46' and status = 'active';
update action_items set title = 'Pay off Citi Best Buy ($660.40) before 12/27 — deferred interest', amount = 660.40, updated_at = now(),
  detail = 'Deferred-interest promo ends 12/27/2026. Min $29 due 11/27; AutoPay is $50, which will not clear it.'
  where id = 'ca550b92-9316-42e5-88b9-39d62dee2528';

insert into action_items (title, detail, priority, status, category, due_date, amount)
select v.title, v.detail, v.priority, 'active', 'finance', v.due, v.amt
from (values
  ('Pay HELOC minimum $974.31', 'CUTX HELOC due 11/5 (and monthly). Balance $185,718.40, $4,281.60 available.', 'red', date '2026-11-05', 974.31),
  ('Cancel Perplexity AI ($21.28/mo on PayPal Credit)', 'PayPal > Settings > Payments > Manage automatic payments > Perplexity AI > Cancel. Next charge ~12/3.', 'amber', date '2026-12-03', 21.28),
  ('Confirm Schwab pay frequency, first payday and start date in writing', 'Model assumes start 11/16, biweekly, first check ~11/30. Also get Compliance approval for the Dallas CTO Club board seat before day one.', 'amber', date '2026-11-13', null),
  ('Chase Nov 9 statements: confirm Freedom Unlimited per-promo balances', 'Card total is $3,574.00; statement prints averages, so the BT3/BT4 split is unverified. Update the promo rows.', 'amber', date '2026-11-10', null),
  ('Pay off Freedom Unlimited (…7117) before 12/9', 'Card owes $3,574.00 (Chase app 11/3). Whole card should be cleared before the 0% ends.', 'red', date '2026-12-09', 3574.00),
  ('Pay off Freedom (…4628) before 12/12', 'Single 0% promo = whole card balance $2,723.94.', 'red', date '2026-12-12', 2723.94),
  ('Prime Visa Equal Pay plan ($191.22) ends 12/22', 'Pay remaining balance before the plan ends; other plans run to 3/22/2027 and 7/22/2027.', 'amber', date '2026-12-22', 191.22),
  ('Pay off PayPal Credit Frontgate plan ($331.51) by 1/4/2027', 'No interest if paid in full by the date (deferred interest). Other plans: $134.54 and $23.58 by 2/4/2027.', 'amber', date '2027-01-04', 331.51),
  ('Property taxes ~$15,000 by 12/31', 'Not escrowed. Plan amount $15,000 (2025 bill was $14,595.02). Texas legal deadline is 1/31/2027 — confirm whether you need it paid in 2026.', 'red', date '2026-12-31', 15000.00),
  ('Schwab: disclose outside brokerage accounts within 10 days of start', 'Chase self-directed IRA (…3509, ~$164.7K) must be moved to Schwab or get an exception (DisclosureGroup@Schwab.com).', 'red', date '2026-11-26', null),
  ('Schwab: enroll in benefits within 31 days; set 401(k) election within 45 days', 'Defaults if you do nothing: only STD/LTD/Basic Life; 401(k) auto-enrolls at 6% pre-tax.', 'amber', date '2026-12-17', null),
  ('Cancel BCBS ($456.66/mo) once Schwab coverage is confirmed', 'BCBS is paid through November; Schwab medical starts day 1 (11/16).', 'amber', date '2026-11-25', 456.66),
  ('Decide: pay or roll the BofA 0% balances (~$19.4K, ends Oct 2027)', 'BT $13,413 + cash advance $6,240 both end Oct 2027, before the 2028 bonus paydown.', 'blue', date '2027-07-01', null)
) as v(title, detail, priority, due, amt)
where not exists (select 1 from action_items a where a.title = v.title);

-- Schwab bonus: the model spreads bonusPct across every paycheck, but the 25% target is discretionary
-- and first pays Feb-Mar 2028, so 2026-2027 cash flow is salary only. (Applied as a second migration.)
update financial_settings set updated_at = now(), value = (
  select jsonb_agg(case when o->>'id' = 'schwab'
    then (o - 'bonusPct') || jsonb_build_object('bonusPct', 0,
         'notes', (o->>'notes') || ' MODEL NOTE: bonusPct set to 0 on purpose — the 25% target ($60K) is excluded from paychecks because it is discretionary and first pays Feb-Mar 2028.')
    else o end)
  from jsonb_array_elements(value) o)
where key = 'job_offers' and exists (select 1 from jsonb_array_elements(value) o where o->>'id' = 'schwab' and (o->>'bonusPct')::numeric <> 0);
