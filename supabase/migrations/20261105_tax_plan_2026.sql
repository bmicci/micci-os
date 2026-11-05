-- 2026 tax inputs (plan v5 section 13) for the Tax Center's return estimate.
insert into financial_settings (key, value) values ('tax_plan_2026', $tax$
{
 "year": 2026, "filingStatus": "single", "asOf": "2026-11-04",
 "source": "Strategic Financial Plan v5, section 13",
 "income": [
  {"label": "JPMorgan W-2", "taxable": 95557, "withheld": 17821,
   "note": "Salary through Mar 19, $15,000 incentive, $47,200 severance (withheld at a flat 22%). Apr 7 pay stub; confirm on the W-2."},
  {"label": "Unemployment (1099-G)", "taxable": 15730, "withheld": 1586,
   "note": "26 weeks at $605, $61 withheld a week. The 9/26 overpayment appeal may change this slightly."},
  {"label": "Charles Schwab W-2", "taxable": 26170, "withheld": 5063,
   "note": "3 checks (Nov 30, Dec 14, Dec 28) after a 5% 401(k) and benefits; assumes biweekly pay with no partial check."}
 ],
 "mortgageInterest": 16700,
 "propertyTaxPaidEarlier": 14595,
 "propertyTaxBill2026": 15000,
 "saltCap": 40400,
 "payPropertyTaxBy": "dec31",
 "notes": ["JPMorgan 401(k) deferrals $1,704 (already excluded from wages)", "No other income, charitable gifts or estimated payments assumed"]
}
$tax$::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
