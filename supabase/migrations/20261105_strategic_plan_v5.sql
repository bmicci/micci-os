-- Strategic Financial Plan v5 (Nov 4, 2026): plan variables as data + debts the plan found.
-- Idempotent. Nothing deleted. The legacy subscriptions / budget_categories / bills tables are
-- left untouched (they hold the 2025 audit); the plan's own figures live in financial_settings.strategic_plan.

-- 1. The plan as data (calculators and the MCP read this) ---------------------------------
insert into financial_settings (key, value) values ('strategic_plan', $plan$
{
 "version": 5, "as_of": "2026-11-04", "status": "draft - subject to change",
 "source": "Strategic_Financial_Plan_2026-2029_v5.docx",
 "assumptions": {
  "horizon": "2026-11 to 2029-12", "rh_apr": 3.99, "car_apr": 3.99, "car_trade_in": 8000,
  "car_sales_tax_pct": 6.25, "car_fees": 500, "car_value_after_3y_pct": 55, "car_target_purchase": "2027-02",
  "bonus_paid_pct": 100, "bonus_net": 37000, "first_bonus": "2028-03",
  "refund_2026": 9700, "refund_2026_if_paid_jan": 6400, "refund_2027_taxyear": 3600,
  "k401_limit_2026": 24500, "k401_limit_2027_projected": 25500, "k401_match_pct": 5, "k401_kicker": 250,
  "net_per_check_5pct": 6257, "net_per_check_max_401k": 5918,
  "take_home_month_5pct": 12514, "take_home_month_max_401k": 11835,
  "property_tax": 15000, "property_tax_setaside_monthly": 1250, "property_tax_pay_by": "2026-12-31",
  "apple_grok_monthly": 168, "emergency_target": {"A": 5000, "B": 3000}
 },
 "strategies": {
  "A": {"label": "Balanced cuts", "cut_per_month": 1490},
  "B": {"label": "Aggressive", "cut_per_month": 2350},
  "C": {"label": "Live now, bonus pays", "cut_per_month": 0}
 },
 "spending_lines": [
  {"name": "Mortgage", "today": 2487, "A": 2487, "B": 2487},
  {"name": "RH financing", "today": 357, "A": 357, "B": 357},
  {"name": "Homeowners insurance", "today": 303, "A": 260, "B": 250},
  {"name": "Auto insurance (current car)", "today": 229, "A": 200, "B": 190},
  {"name": "State Farm policy", "today": 69, "A": 69, "B": 69},
  {"name": "Electricity", "today": 380, "A": 330, "B": 320},
  {"name": "Gas, water, trash", "today": 101, "A": 101, "B": 101},
  {"name": "Internet", "today": 106, "A": 80, "B": 75},
  {"name": "UT Southwestern payment", "today": 80, "A": 80, "B": 80},
  {"name": "Apple Card (installments + Apple/Grok)", "today": 335, "A": 335, "B": 335},
  {"name": "Food & dining", "today": 1927, "A": 1400, "B": 1100},
  {"name": "Personal", "today": 881, "A": 750, "B": 600},
  {"name": "Gym", "today": 247, "A": 28, "B": 28},
  {"name": "Health & wellness", "today": 333, "A": 333, "B": 333},
  {"name": "Subscriptions", "today": 320, "A": 200, "B": 120},
  {"name": "Shopping", "today": 524, "A": 400, "B": 250},
  {"name": "Transportation", "today": 200, "A": 200, "B": 200},
  {"name": "Entertainment", "today": 193, "A": 193, "B": 110},
  {"name": "Travel", "today": 149, "A": 149, "B": 80},
  {"name": "Fees", "today": 148, "A": 0, "B": 0},
  {"name": "Repairs & other", "today": 322, "A": 250, "B": 250}
 ],
 "car_tiers": [
  {"price": 50000, "insurance_increase": 125},
  {"price": 75000, "insurance_increase": 200},
  {"price": 100000, "insurance_increase": 275}
 ],
 "subscriptions": [
  {"name": "Lifetime Fitness", "monthly": 247, "action": "switch", "note": "One Pass Select (UHC) or LifeCare $28: saves ~$220", "replacement": 28},
  {"name": "Destiney & Co", "monthly": 85, "action": "review", "note": "Keep only if essential"},
  {"name": "Virginia Pump", "monthly": 82, "action": "cancel", "note": "Looks like a Short Pump, VA membership; cancel if unused"},
  {"name": "Adobe", "monthly": 22, "action": "review", "note": "Keep only if used"},
  {"name": "Perplexity", "monthly": 21, "action": "canceled", "note": "Canceled 2026-11-05"},
  {"name": "Google Workspace", "monthly": 17, "action": "keep"},
  {"name": "Paddle (Sastoria)", "monthly": 16, "action": "review", "note": "Identify; cancel if unused"},
  {"name": "Blizzard", "monthly": 16, "action": "keep"},
  {"name": "Paramount+", "monthly": 15, "action": "cancel", "note": "Flagged unused"},
  {"name": "Vercel", "monthly": 11, "action": "keep", "note": "micci-os"},
  {"name": "Uber One", "monthly": 10, "action": "cancel", "note": "Unless used often"},
  {"name": "GoodRx", "monthly": 10, "action": "cancel", "note": "Once Schwab Rx coverage starts"},
  {"name": "GoPro", "monthly": 6, "action": "cancel", "note": "Flagged unused"},
  {"name": "CVS", "monthly": 5, "action": "cancel", "note": "If unused"},
  {"name": "Raidbots", "monthly": 3, "action": "keep"},
  {"name": "Apple.com/bill (4 charges)", "monthly": 178, "action": "review", "note": "Settings > Apple Account > Subscriptions; cancel what you don't use"},
  {"name": "Grok (xAI)", "monthly": 15.99, "action": "review", "note": "Consolidate AI tools"}
 ],
 "bills": [
  {"name": "Property tax set-aside", "monthly": 1250, "lever": "Protest again by May 15, 2027", "save_low": 140, "save_high": 140},
  {"name": "Homeowners insurance", "monthly": 303, "lever": "Reshop, raise deductible, bundle", "save_low": 40, "save_high": 90},
  {"name": "Auto insurance", "monthly": 229, "lever": "Reshop when you buy; quote before choosing a car", "save_low": 30, "save_high": 100},
  {"name": "State Farm policy", "monthly": 69, "lever": "Confirm coverage; bundle", "save_low": 0, "save_high": 20},
  {"name": "BCBS health", "monthly": 457, "lever": "Ends with Schwab coverage (cancel the day it starts)", "save_low": 457, "save_high": 457},
  {"name": "Electricity (TXU)", "monthly": 455, "lever": "Compare fixed-rate plans on PowerToChoose", "save_low": 50, "save_high": 120},
  {"name": "Internet (AT&T)", "monthly": 106, "lever": "Retention call or switch", "save_low": 20, "save_high": 40},
  {"name": "Apple Card services", "monthly": 168, "lever": "Review Apple.com/bill subscriptions and Grok", "save_low": 40, "save_high": 100}
 ],
 "k401_elections": [
  {"id": "5pct", "label": "5% (baseline)", "base_pct": 5, "bonus_pct": 5},
  {"id": "default", "label": "Default: 6%, +1% each March", "base_pct": 6, "bonus_pct": 6},
  {"id": "10pct", "label": "10% of base and bonus", "base_pct": 10, "bonus_pct": 10},
  {"id": "max", "label": "Max (~10.6% of base in 2027)", "base_pct": 10.6, "bonus_pct": 5},
  {"id": "ramp", "label": "Ramp: 5% until cards clear, then max", "base_pct": 5, "bonus_pct": 5}
 ],
 "paydown_order": [
  "Deferred-interest promos on time (Best Buy, PayPal)",
  "Any balance at 25%+: Chase 7117 and 4628, and any new card borrowing",
  "Citi (19.74% after Jun 18, 2027) and BofA (after Oct 18, 2027), whichever costs more then",
  "Family loan (8.5%)",
  "HELOC (6.85%); RH (3.99%) and the car loan (3.99%) last, never prepay them ahead of the HELOC"
 ],
 "results_debt_end_2029": {
  "A": {"no_car": 64137, "car_50k": 121223, "car_75k": 154929, "car_100k": 187561},
  "B": {"no_car": 26168, "car_50k": 83651, "car_75k": 117503, "car_100k": 151184},
  "C": {"no_car": 146700, "car_50k": 193645, "car_75k": 219541, "car_100k": 253070}
 },
 "decisions": {
  "spending_strategy": null, "recommended": "A or B with a $50-75K car",
  "car": null, "property_tax": "Pay by 2026-12-31 (decided 2026-11-05)",
  "k401_dec_2026": "5%", "k401_2027": "Set after the IRS announces the 2027 limit (~mid-Nov); ~10.6% reaches $25,500",
  "supplemental_life": "Decide within 31 days of 2026-11-16"
 },
 "not_tracked": {"verizon_line_monthly": 86.88, "verizon_reimbursed": null,
  "note": "On Dad's plan; excluded from cash flow unless you reimburse him. iPhone 17 Pro payment 12 of 36, $866.64 left."}
}
$plan$::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- 2. Debts the plan found that micci-os did not track ------------------------------------
insert into debt_accounts (name, account_type, balance, interest_rate, minimum_payment, status, recommendation, notes)
select v.name, v.t, v.bal, v.rate, v.minpay, 'active', 'keep', v.notes
from (values
  ('RH Credit Card (Synchrony) ···1380', 'credit_card', 13853.00, 3.99, 357.00,
   'Keep — nine fixed-pay 60-month plans at 3.99% (May-Aug 2026); limit $20,000. Never charge new purchases (34.99%). Balance per RH/Synchrony statement 2026-11-02.'),
  ('Apple Card installments', 'loan', 900.00, 0.00, 167.00,
   'Keep — 0% installments: Mac mini ends Mar 2027, second $1,040 purchase ends Jun 2027. $900 unbilled (total balance $1,261 incl. the October statement balance paid in full).'),
  ('UT Southwestern payment plan ···8399', 'other', 1192.00, 0.00, 80.37,
   'Keep — 0% medical plan, 15 payments left (ends ~Jan 2028), autopay on Amex Platinum. Ask about a pay-in-full discount.')
) as v(name, t, bal, rate, minpay, notes)
where not exists (select 1 from debt_accounts d where d.name = v.name);
update debt_accounts set minimum_payment = 325.00, updated_at = now(),
  notes = coalesce(notes || ' · ', '') || 'Owner sends $325/mo (plan v5), not $350.'
  where name = 'Virginia FCU Loan (via Dad)' and minimum_payment <> 325.00;

-- 3. Cash: the plan models savings at $0 ---------------------------------------------------
update financial_settings set updated_at = now(), value = value || jsonb_build_object('savings', 0) where key = 'assets';
update financial_settings set updated_at = now(), value = value || jsonb_build_object('liquid_cash', 2275.84) where key = 'income_bridge';

-- 4. Action Center: dated items from the plan ------------------------------------------------
update action_items set updated_at = now(),
  detail = 'Not escrowed. Decided: pay by Dec 31 for the 2026 deduction (about $15,000). Plan v5 funds it with the last $4,282 of HELOC room, a short card balance (~$6,400, ~$130/mo), and the ~$9,700 federal refund in March 2027. The extra deduction is worth about $3,300 of refund.'
  where title like 'Property taxes ~$15,000 by 12/31%' and status = 'active';
insert into action_items (title, detail, priority, status, category, due_date, amount)
select v.title, v.detail, v.priority, 'active', 'finance', v.due, v.amt
from (values
  ('File the TWC appeal for the 9/26 overpayment ($605)', 'Deadline is on page 1 of the determination (about Nov 11 — verify). The packet has the statement and dated log.', 'red', date '2026-11-11', 605.00),
  ('Read the Amex statements: Gold due Nov 10 (~$2,650), Platinum due Nov 28 (~$3,350)', 'Both are paid in full; confirm the statement balances before they draft. Low point around Nov 28-29 may need HELOC room or carrying part of one statement.', 'amber', date '2026-11-10', null),
  ('Tell Claude if you reimburse Dad for the Verizon line ($86.88/mo)', 'Excluded from the plan unless you reimburse him (about $3,700 added to 2029 debt if you do).', 'blue', null, 86.88),
  ('Set the 2027 401(k) rate after the IRS announces the limit (~mid-Nov)', 'Plan: ~10.6% of base reaches $25,500 (~$978/check); 5% for Dec 2026. Default if you do nothing: 6% auto-enroll after 45 days, +1% each March.', 'amber', date '2026-12-31', null),
  ('Book the free Schwab Employee Branch planning session before finalizing the 401(k)', '800-833-0444 option 4, jumpword EB. Also ask them to help move the Chase IRA and the old 401(k).', 'blue', date '2026-12-10', null),
  ('Make the first spending cuts: gym switch, subscription cancellations, quotes', 'Gym to One Pass Select/LifeCare (~$220/mo); cancel Paramount+, GoPro, Uber One, Virginia Pump; review Apple.com/bill and Grok. Quote electricity (PowerToChoose), homeowners and auto insurance, internet.', 'amber', date '2026-11-30', null),
  ('Get credit union car quotes (purchase and lease); target a February 2027 purchase', 'Pick a price tier first ($50K / $75K / $100K); each $25K adds ~$490/mo at 3.99% and ~$33K to 2029 debt. Get the auto insurance quote before choosing.', 'blue', date '2027-01-31', null),
  ('Pick a spending strategy: A (balanced, -$1,490/mo) or B (aggressive, -$2,350/mo)', 'Plan v5 recommends A or B; C (live now, bonus pays) ends 2029 with ~$64K more debt for the same car.', 'amber', date '2026-12-01', null)
) as v(title, detail, priority, due, amt)
where not exists (select 1 from action_items a where a.title = v.title);
