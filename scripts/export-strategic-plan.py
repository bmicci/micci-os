#!/usr/bin/env python3
"""Export the Master Financial Model workbook as a strategic-plan migration.

Usage:
  python3 scripts/export-strategic-plan.py <workbook.xlsx> <meta.json> <out.sql> \
      [--scenario name=recalculated.xlsx ...]

The workbook's cached values are the plan (CF_A/B/C month ends, Cash Ledger,
Budget, Subscriptions, Debts, Paycheck, Inputs). <meta.json> carries what the
workbook does not hold: version, dates, the written trade-offs, deadlines,
next steps and risks from the plan document, plus account_overrides where
the document is stricter than the Debts sheet (e.g. an earlier pay-by date). Scenario workbooks (the same model
recalculated with one lever changed, e.g. car=buy50) fill the car table.

Nothing is computed here beyond rounding; the workbook is the model.
"""
import json
import sys
from datetime import datetime

import openpyxl

FIRST_COL, LAST_COL = 3, 39  # C..AM = Dec 2026 .. Dec 2029

ACCOUNTS = [
    # key, label, CF end-balance row, Debts row, match
    ('chase_4628', 'Chase Freedom ···4628', 44, 6, {'last4': '4628'}),
    ('citi_bestbuy_4802', 'Citi Best Buy ···4802', 52, 8, {'last4': '4802'}),
    ('paypal_0646', 'PayPal Credit ···0646', 60, 9, {'last4': '0646'}),
    ('chase_7117', 'Chase Freedom Unlimited ···7117', 68, 7, {'last4': '7117'}),
    ('citi_diamond_4205', 'Citi Diamond ···4205', 76, 10, {'last4': '4205'}),
    ('bofa_1205', 'BofA BankAmericard ···1205', 84, 11, {'last4': '1205'}),
    ('rollover_0pct', '0% rollover card (new)', 91, 12, {'name': 'rollover'}),
    ('virginia_fcu', 'Virginia FCU loan (via Dad)', 96, 13, {'name': 'virginia'}),
    ('heloc', 'Credit Union of Texas HELOC', 100, 14, {'category': 'HELOC'}),
    ('rh', 'RH Credit Card (Synchrony)', 102, 15, {'name': 'rh credit'}),
    ('ut_southwestern', 'UT Southwestern payment plan', 103, 16, {'name': 'ut southwestern'}),
    ('apple_installments', 'Apple Card installments', 104, 17, {'name': 'apple card installments'}),
]
PROMO_KEYS = {'chase_4628', 'citi_bestbuy_4802', 'paypal_0646', 'chase_7117', 'citi_diamond_4205', 'bofa_1205'}

SERIES = {'debt': 127, 'cards': 124, 'savings': 120, 'interest': 128, 'checking': 121,
          'inflows': 13, 'outflows': 28, 'card_mins': 108, 'extra': 119}


def expect(ws, row, text):
    """Fail loudly if the workbook's layout moved."""
    label = str(ws.cell(row, 1).value or '')
    if text.lower() not in label.lower():
        sys.exit(f'{ws.title} row {row}: expected "{text}", found "{label}". Update the row map.')


def row_values(ws, row, digits=0):
    out = []
    for c in range(FIRST_COL, LAST_COL + 1):
        v = ws.cell(row, c).value
        v = 0 if v is None else v
        out.append(round(v, digits) if digits else int(round(v)))
    return out


def iso(d):
    return d.strftime('%Y-%m-%d') if isinstance(d, datetime) else None


def money(v):
    return None if v is None else round(float(v), 2)


def main():
    args = sys.argv[1:]
    if len(args) < 3:
        sys.exit(__doc__)
    book, meta_path, out_path = args[:3]
    scenarios = dict(a.split('=', 1) for a in args[4:]) if len(args) > 3 and args[3] == '--scenario' else {}
    meta = json.load(open(meta_path))
    wb = openpyxl.load_workbook(book, data_only=True)

    cf = {s: wb[f'CF_{s}'] for s in 'ABC'}
    a = cf['A']
    expect(a, 127, 'Non-mortgage debt including the car')
    expect(a, 124, 'All card balances')
    expect(a, 120, 'Savings balance')
    expect(a, 121, 'Checking at month end')
    expect(a, 128, 'Interest this month')
    expect(a, 119, 'Extra payments made')
    expect(a, 108, 'Card minimums')
    for row, name in [(37, '4628'), (45, 'Best Buy'), (53, 'PayPal'), (61, '7117'), (69, 'Citi Diamond'), (77, 'BofA'),
                      (85, 'rollover'), (92, 'Virginia'), (97, 'HELOC'), (102, 'RH'), (103, 'UT Southwestern'), (104, 'Apple')]:
        expect(a, row, name)

    months = [a.cell(3, c).value.strftime('%Y-%m') for c in range(FIRST_COL, LAST_COL + 1)]
    debts = wb['Debts']

    accounts = []
    for key, label, cf_row, d_row, match in ACCOUNTS:
        acct = {'key': key, 'label': label, 'match': match, 'start': money(a.cell(cf_row, 2).value) or 0}
        if key in PROMO_KEYS:
            acct.update({
                'rate_after': debts.cell(d_row, 4).value,
                'promo_ends': iso(debts.cell(d_row, 5).value),
                'min': debts.cell(d_row, 6).value,
                'deferred_interest': debts.cell(d_row, 7).value or 0,
                'order': debts.cell(d_row, 9).value,
            })
        acct.update(meta.get('account_overrides', {}).get(key, {}))
        accounts.append(acct)

    projection = {}
    for s, ws in cf.items():
        p = {name: row_values(ws, row) for name, row in SERIES.items()}
        p['accounts'] = {key: row_values(ws, cf_row) for key, _, cf_row, _, _ in ACCOUNTS}
        projection[s] = p

    # Cash ledger: header row is the one whose first cell is "Date".
    led = wb['Cash Ledger']
    rows, notes, inputs = [], [], {}
    seen_header = False
    for r in led.iter_rows(values_only=True):
        if r[0] == 'Date':
            seen_header = True
            continue
        if not seen_header:
            if r[0] is None and r[1] and isinstance(r[2], (int, float)):
                inputs[r[1]] = money(r[2])
            continue
        if isinstance(r[0], datetime):
            rows.append({'date': iso(r[0]), 'item': r[1], 'a': money(r[2]), 'a_balance': money(r[3]),
                         'b': money(r[4]), 'b_balance': money(r[5])})
        elif r[1] and r[3] is None and r[5] is None:
            notes.append(r[1])
    if not rows:
        sys.exit('Cash Ledger: no dated rows found.')
    ledger = {
        'account': 'Chase checking ···5332',
        'cases': {'a': "Mom's gift arrives Dec 31", 'b': "Mom's gift arrives by Nov 27"},
        'start': {'date': rows[0]['date'], 'balance': rows[0]['a_balance']},
        'end': {'date': '2027-01-31', 'a': rows[-1]['a_balance'], 'b': rows[-1]['b_balance']},
        'low': {'a': min(r['a_balance'] for r in rows), 'b': min(r['b_balance'] for r in rows)},
        'rows': rows[1:],
        'notes': notes,
    }

    # Budget lines (Today / A / B / C) and the spare cash in a normal month.
    bud = wb['Budget']
    spending, left = [], None
    for r in bud.iter_rows(min_row=17, values_only=True):
        if r[0] == 'Left for extra debt payments':
            left = {'today': r[2], 'A': r[3], 'B': r[4], 'C': r[5]}
            break
        if r[1] in ('Non-discretionary', 'Debt', 'Discretionary') and isinstance(r[2], (int, float)):
            spending.append({'name': r[0], 'group': r[1], 'today': round(r[2]), 'A': round(r[3]), 'B': round(r[4]), 'C': round(r[5])})
    if left is None:
        sys.exit('Budget: "Left for extra debt payments" not found.')
    points_bonus = meta.get('travel_on_points_2027', 0)

    subs = []
    for r in wb['Subscriptions'].iter_rows(min_row=5, values_only=True):
        if r[0] and isinstance(r[2], (int, float)) and r[4]:
            status = str(r[4]).lower()
            subs.append({'name': r[0], 'monthly': money(r[2]), 'in_budget': money(r[6]) or 0, 'billing': r[3],
                         'action': 'keep' if status == 'not budgeted' else status,
                         **({'note': r[7]} if r[7] else {})})

    pay = wb['Paycheck']
    inp = {r[0]: r[1] for r in wb['Inputs'].iter_rows(values_only=True) if r[0] is not None and r[1] is not None}
    summ = wb['Summary']

    def debt_2029(path):
        s = openpyxl.load_workbook(path, data_only=True)['Summary']
        return {k: int(round(s.cell(9, c).value)) for k, c in (('A', 2), ('B', 3), ('C', 4))}

    car = {k: debt_2029(p) for k, p in scenarios.items()}
    car[meta.get('base_car_key', 'lease')] = {k: int(round(summ.cell(9, c).value)) for k, c in (('A', 2), ('B', 3), ('C', 4))}

    start_debt = money(a.cell(127, 2).value)
    end_a = projection['A']
    master = {
        'base_case': meta['base_case'],
        'start': {'date': '2026-11-30', 'non_mortgage_debt': start_debt, 'checking': money(a.cell(121, 2).value)},
        'kpis': {
            'spare_month_2027': {k: int(round(left[k] + points_bonus)) for k in 'ABC'},
            'savings_target': inp.get('Savings target in phase 2 (high-yield savings)'),
            'checking_floor': inp.get('Minimum checking balance'),
            'heloc_payment': int(round(inp.get('HELOC payment (principal + interest)', 0))),
            'heloc_payment_from': iso(inp.get('HELOC: start a mortgage-style payment')),
            'heloc_limit': meta.get('heloc_limit'),
        },
        'milestones': meta['milestones'],
        'deadlines': meta['deadlines'],
        'tradeoffs': meta['tradeoffs'],
        'next_60_days': meta['next_60_days'],
        'risks': meta['risks'],
        'excluded_accounts': meta['excluded_accounts'],
        'cash_ledger': ledger,
        'months': months,
        'accounts': accounts,
        'projection': projection,
    }

    plan = {
        'version': meta['version'],
        'as_of': meta['as_of'],
        'status': meta['status'],
        'source': meta['source'],
        'strategies': {
            k: {'label': lbl, 'normal_month_left': int(round(left[k])), 'normal_month_left_2027': int(round(left[k] + points_bonus))}
            for k, lbl in (('A', 'Balanced (recommended)'), ('B', 'Aggressive'), ('C', 'Live now'))
        },
        'spending_lines': spending,
        'subscriptions': subs,
        'k401_elections': meta['k401_elections'],
        'paydown_order': meta['paydown_order'],
        'results_debt_end_2029': {k: {name: car[name][k] for name in car} for k in 'ABC'},
        'decisions': meta['decisions'],
        'not_tracked': meta['not_tracked'],
        'master_plan': master,
    }

    assumptions = {
        'pay_frequency': 'semi-monthly (24 checks: 15th and last day)',
        'base_salary': inp.get('Base salary'),
        'net_per_check_5pct': int(round(pay['C20'].value)),
        'net_per_check_10pct': int(round(pay['D20'].value)),
        'net_per_check_max_401k': int(round(pay['E20'].value)),
        'net_per_check_2028': int(round(pay['G20'].value)),
        'take_home_month_5pct': int(round(pay['C21'].value)),
        'take_home_month_10pct': int(round(pay['D21'].value)),
        'take_home_month_max_401k': int(round(pay['E21'].value)),
        'take_home_month_plan': int(round(pay['F21'].value)),
        'w4_itemizing_monthly': 0,
        'bonus_net': int(round(pay['B35'].value)),
        'bonus_net_in_march': meta.get('bonus_net_in_march'),
        'first_bonus': '2028-03',
        'bonus_share_to_debt_from_2029_pct': int(round(100 * inp.get('Share of each bonus to debt from 2029 (A and B)', 1))),
        'refund_2026': inp.get('2026 federal tax refund (Mar 2027)'),
        'refund_2027_taxyear': inp.get('2027 federal tax refund (Mar 2028)'),
        'tax_settle_up_2028': inp.get('2028 tax settle-up (Mar 2029): refund (+) or bill (-)'),
        'irs_2022_refund_unconfirmed': inp.get('IRS 2022 refund owed to you'),
        'mom_gift_property_tax': inp.get("Mom's gift for property taxes"),
        'lease_payment': inp.get('Car payment per month (lease, or buy $50K at $831)'),
        'lease_insurance_increase': inp.get('Insurance increase on a leased car'),
        'lease_term_months': inp.get('Lease term (months)'),
        'car_trade_in': inp.get('Trade-in'),
        'car_target_purchase': '2027-02',
        'heloc_amortize_from': '2028-04',
        'heloc_term_years': inp.get('HELOC: payoff term (years)'),
        'heloc_payment_amortizing': int(round(inp.get('HELOC payment (principal + interest)', 0))),
        'savings_phase1': '$500/mo to $5,000',
        'savings_phase2': f"to ${int(inp.get('Savings target in phase 2 (high-yield savings)', 0)):,} from 2028-04; the rest to the HELOC",
        'checking_floor': inp.get('Minimum checking balance'),
        'rate_ceiling_pct': '7 to 8',
        'balance_transfer_fee_pct': 3,
        'rollover_0pct_months': inp.get('0% months on the new transfer card (from Oct 2027)'),
        'property_tax': inp.get('2026 property tax paid Dec 31, 2026'),
        'property_tax_setaside_monthly': int(round((inp.get('Property tax per year from 2027 (paid each December)') or 0) / 12)),
        'property_tax_pay_by': '2026-12-31',
        'k401_limit_2027_projected': inp.get('401(k) limit 2027 (projected)'),
        'emergency_target': {'A': inp.get('Emergency fund target, A'), 'B': inp.get('Emergency fund target, B')},
    }

    def compact(obj):
        """Indent objects, but keep number arrays on one line."""
        text = json.dumps(obj, indent=1, ensure_ascii=False)
        import re
        return re.sub(r'\[\s+((?:-?[\d.]+,\s+)*-?[\d.]+)\s+\]', lambda m: '[' + re.sub(r'\s+', '', m.group(1)) + ']', text)

    v = meta['version']
    sql = f"""-- Strategic Financial Plan v{v} ({meta['as_of']}) + Master Financial Model: the plan as data.
-- Generated by scripts/export-strategic-plan.py from the workbook's cached values. Idempotent.
-- Merges into financial_settings.strategic_plan: top-level keys are replaced, assumptions are
-- merged over the stored ones, and keys this version doesn't touch (bills, car_tiers) are kept.
-- master_plan holds the month-by-month projection (CF_A/B/C, Dec 2026 to Dec 2029) and the
-- dated cash ledger that /finance/plan compares against live balances. Nothing else is written.

update financial_settings
set updated_at = now(),
    value = (value || $plan$
{compact(plan)}
$plan$::jsonb)
  || jsonb_build_object('assumptions', coalesce(value->'assumptions', '{{}}'::jsonb) || $a$
{compact(assumptions)}
$a$::jsonb)
where key = 'strategic_plan';
"""
    open(out_path, 'w').write(sql)
    print(f'wrote {out_path}: {len(months)} months, {len(rows) - 1} ledger rows, debt {start_debt} -> {end_a["debt"][-1]} (A)')


if __name__ == '__main__':
    main()
