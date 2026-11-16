-- Strategic Financial Plan v8 (Nov 6, 2026) + Master Financial Model: the plan as data.
-- Idempotent. Merges into financial_settings.strategic_plan: top-level keys are replaced,
-- assumptions are merged over v5's (v5-only keys such as car_apr stay), and keys v8 doesn't
-- touch (bills, car_tiers) are kept. master_plan holds the workbook's month-by-month
-- projection (CF_A/B/C cached values, Dec 2026 to Dec 2029) that /finance/plan compares
-- against live balances. Nothing else is written.

update financial_settings
set updated_at = now(),
    value = (value || $plan$
{
 "version": 8,
 "as_of": "2026-11-06",
 "status": "base case (recommended)",
 "source": "Strategic_Financial_Plan_2026-2029_v8.docx + Micci_Master_Financial_Model.xlsx",
 "strategies": {
  "A": {
   "label": "Balanced (recommended)",
   "normal_month_left": -217,
   "normal_month_left_2027": -17
  },
  "B": {
   "label": "Aggressive",
   "normal_month_left": 666,
   "normal_month_left_2027": 866
  },
  "C": {
   "label": "Live now",
   "normal_month_left": -771,
   "normal_month_left_2027": -571
  }
 },
 "spending_lines": [
  {
   "name": "Mortgage (BofA, 3.375%)",
   "today": 2487,
   "A": 2487,
   "B": 2487
  },
  {
   "name": "Property tax set-aside",
   "today": 0,
   "A": 1250,
   "B": 1250
  },
  {
   "name": "Home, auto, jewelry insurance",
   "today": 601,
   "A": 529,
   "B": 529
  },
  {
   "name": "Electricity",
   "today": 380,
   "A": 300,
   "B": 300
  },
  {
   "name": "Gas (Atmos)",
   "today": 49,
   "A": 49,
   "B": 49
  },
  {
   "name": "Water and trash",
   "today": 52,
   "A": 52,
   "B": 52
  },
  {
   "name": "Internet",
   "today": 106,
   "A": 40,
   "B": 40
  },
  {
   "name": "Verizon line (paid to Dad)",
   "today": 87,
   "A": 87,
   "B": 87
  },
  {
   "name": "BCBS health insurance",
   "today": 457,
   "A": 0,
   "B": 0
  },
  {
   "name": "Health and wellness",
   "today": 333,
   "A": 333,
   "B": 333
  },
  {
   "name": "HELOC interest (6.85%)",
   "today": 1060,
   "A": 1060,
   "B": 1060
  },
  {
   "name": "Virginia FCU loan (via Dad)",
   "today": 325,
   "A": 325,
   "B": 325
  },
  {
   "name": "RH Credit Card (3.99%)",
   "today": 357,
   "A": 357,
   "B": 357
  },
  {
   "name": "UT Southwestern",
   "today": 80,
   "A": 80,
   "B": 80
  },
  {
   "name": "Apple Card installments",
   "today": 167,
   "A": 167,
   "B": 167
  },
  {
   "name": "Credit card minimums",
   "today": 448,
   "A": 448,
   "B": 448
  },
  {
   "name": "Car payment (lease)",
   "today": 0,
   "A": 1100,
   "B": 1100
  },
  {
   "name": "Commute (4 days a week)",
   "today": 0,
   "A": 237,
   "B": 237
  },
  {
   "name": "Other transportation",
   "today": 200,
   "A": 100,
   "B": 100
  },
  {
   "name": "Car insurance increase",
   "today": 0,
   "A": 200,
   "B": 200
  },
  {
   "name": "Subscriptions and memberships",
   "today": 738,
   "A": 496,
   "B": 496
  },
  {
   "name": "Food and dining",
   "today": 1927,
   "A": 1200,
   "B": 1100
  },
  {
   "name": "Personal",
   "today": 881,
   "A": 750,
   "B": 600
  },
  {
   "name": "Shopping",
   "today": 524,
   "A": 400,
   "B": 250
  },
  {
   "name": "Entertainment",
   "today": 193,
   "A": 193,
   "B": 110
  },
  {
   "name": "Travel",
   "today": 149,
   "A": 300,
   "B": 150
  },
  {
   "name": "Repairs and other",
   "today": 322,
   "A": 250,
   "B": 250
  },
  {
   "name": "Fees",
   "today": 148,
   "A": 0,
   "B": 0
  }
 ],
 "subscriptions": [
  {
   "name": "Lifetime Fitness",
   "monthly": 247,
   "action": "keep"
  },
  {
   "name": "Google Workspace",
   "monthly": 16.8,
   "action": "keep"
  },
  {
   "name": "Blizzard (WoW)",
   "monthly": 16.23,
   "action": "keep"
  },
  {
   "name": "Apple One Premier (Apple)",
   "monthly": 42.81,
   "action": "keep"
  },
  {
   "name": "Vercel",
   "monthly": 0.94,
   "action": "keep",
   "note": "$11.25 a year"
  },
  {
   "name": "Adobe",
   "monthly": 21.64,
   "action": "review"
  },
  {
   "name": "Claude Pro (Apple)",
   "monthly": 21.65,
   "action": "review",
   "note": "Check for a duplicate Anthropic plan"
  },
  {
   "name": "LinkedIn Premium Career (Apple)",
   "monthly": 32.46,
   "action": "review",
   "note": "Search is done"
  },
  {
   "name": "Raya+ (Apple)",
   "monthly": 54.11,
   "action": "review"
  },
  {
   "name": "Grok",
   "monthly": 15.99,
   "action": "review",
   "note": "Deciding"
  },
  {
   "name": "Paddle (Sastoria)",
   "monthly": 16.23,
   "action": "review",
   "note": "Identify"
  },
  {
   "name": "Uber One",
   "monthly": 9.99,
   "action": "review"
  },
  {
   "name": "TIDAL (Apple)",
   "monthly": 13.99,
   "action": "review",
   "note": "No receipt since August; likely cancelled"
  },
  {
   "name": "Paramount+",
   "monthly": 15.14,
   "action": "cancel"
  },
  {
   "name": "Destiney & Co",
   "monthly": 85.0,
   "action": "cancel"
  },
  {
   "name": "Virginia Pump",
   "monthly": 82.35,
   "action": "cancel"
  },
  {
   "name": "Perplexity",
   "monthly": 21.28,
   "action": "canceled",
   "note": "Canceled 2026-11-05"
  },
  {
   "name": "GoodRx",
   "monthly": 9.99,
   "action": "cancel"
  },
  {
   "name": "GoPro",
   "monthly": 6.39,
   "action": "cancel"
  },
  {
   "name": "CVS",
   "monthly": 5.0,
   "action": "cancel"
  },
  {
   "name": "Raidbots",
   "monthly": 3.0,
   "action": "cancel"
  }
 ],
 "k401_elections": [
  {
   "id": "5pct",
   "label": "5% (baseline)",
   "base_pct": 5,
   "bonus_pct": 5
  },
  {
   "id": "ramp",
   "label": "Ramp: 5% in 2027, 10% from 2028",
   "base_pct": 5,
   "bonus_pct": 5
  },
  {
   "id": "10pct",
   "label": "10% of base and bonus",
   "base_pct": 10,
   "bonus_pct": 10
  },
  {
   "id": "max",
   "label": "Max (~10.6% of base in 2027) — recommended",
   "base_pct": 10.6,
   "bonus_pct": 5
  }
 ],
 "paydown_order": [
  "Chase Freedom ···4628 (promo ends Dec 12, 2026)",
  "Chase Freedom Unlimited ···7117 (promo ends Dec 9; paid from the Nov 30 check)",
  "Citi Best Buy ···4802 ($312 deferred interest if not paid by Dec 27)",
  "PayPal Credit ···0646 ($332 by Jan 4, rest by Feb 4, 2027)",
  "Citi Diamond ···4205 (promo ends Jun 18, 2027)",
  "BofA ···1205 (promo ends Oct 18, 2027)",
  "Whatever is left at each deadline rolls to a 0% card (3% fee); the Mar 2027 refund and Mar 2028 bonus clear it. Never carry anything above 7-8%.",
  "Then the HELOC on a 20-year schedule from Apr 2028, plus half of each bonus from 2029. RH (3.99%) stays on its fixed payment."
 ],
 "results_debt_end_2029": {
  "A": {
   "no_car": 77216,
   "lease_1100": 124785,
   "car_50k": 131293,
   "car_75k": 164237
  },
  "B": {
   "no_car": 51264,
   "lease_1100": 98978,
   "car_50k": 105418,
   "car_75k": 138698
  },
  "C": {
   "no_car": 101325,
   "lease_1100": 136539,
   "car_50k": 146499,
   "car_75k": 173049
  }
 },
 "decisions": {
  "spending_strategy": "A: Balanced (dining $1,200)",
  "k401_2027": "Max once the IRS announces the limit (10.6% if $25,500); Ramp is the fallback if a 0% transfer falls through",
  "car": "Lease at ~$1,100 from Feb 2027 (target; still shopping)",
  "promos": "Roll to 0% at each deadline; nothing above 7-8%",
  "bonus_from_2029": "50% HELOC / 50% savings and life",
  "heloc": "20-year payment (~$1,423) from Apr 2028",
  "travel_2027": "Amex points; cash travel $100/mo",
  "w4": "Change for itemizing (+~$300/mo) — confirm with a CPA",
  "property_tax": "Pay Dec 31, 2026 with Mom's $15,000",
  "inheritance": "Not in the plan; upside only"
 },
 "not_tracked": {
  "note": "Verizon line ($86.88, then $62.29 after Oct 2028) is now in the budget. IRS 2022 refund ($5,000) is off until confirmed. Amex Gold/Platinum, Chase Prime ···9313 and Apple Card are paid in full monthly and are not plan debt."
 },
 "master_plan": {
  "base_case": {
   "strategy": "A",
   "k401": "Max",
   "car": "Lease $1,100 from Feb 2027",
   "promos": "Rollover to 0% (3% fee)",
   "bonus_share_to_debt_2029": 0.5,
   "w4_change": true,
   "mom_gift": true,
   "irs_2022_refund": false,
   "heloc_amortize_from": "2028-04",
   "heloc_term_years": 20
  },
  "start": {
   "date": "2026-11-30",
   "non_mortgage_debt": 257678.27,
   "checking": 4000
  },
  "milestones": [
   {
    "key": "promos_safe",
    "label": "No balance above 7-8%",
    "target": "always",
    "kind": "rule"
   },
   {
    "key": "cards_cleared",
    "label": "All promo cards cleared",
    "target": "2028-03"
   },
   {
    "key": "emergency_5k",
    "label": "Emergency fund $5,000",
    "target": "2027-09",
    "savings": 5000
   },
   {
    "key": "savings_20k",
    "label": "Savings $20,000+",
    "target": "2029-12",
    "savings": 35675
   },
   {
    "key": "debt_2029",
    "label": "Non-mortgage debt $124,785",
    "target": "2029-12",
    "debt": 124785
   },
   {
    "key": "heloc_paid",
    "label": "HELOC paid off",
    "target": "2033-10"
   }
  ],
  "deadlines": [
   {
    "date": "2026-11-30",
    "what": "Apple Card balance; first Schwab check",
    "amount": 361,
    "inflow": 6750
   },
   {
    "date": "2026-12-09",
    "what": "Chase Freedom Unlimited ···7117 promo ends (26.24% after)",
    "amount": 3574,
    "account": "chase_7117",
    "kind": "promo"
   },
   {
    "date": "2026-12-10",
    "what": "Amex Gold statement",
    "amount": 2566.29
   },
   {
    "date": "2026-12-12",
    "what": "Chase Freedom ···4628 promo ends (25.24% after)",
    "amount": 2724,
    "account": "chase_4628",
    "kind": "promo"
   },
   {
    "date": "2026-12-15",
    "what": "Schwab check",
    "inflow": 6750
   },
   {
    "date": "2026-12-27",
    "what": "Citi Best Buy ···4802 deferred interest ($312 if unpaid)",
    "amount": 660,
    "account": "citi_bestbuy_4802",
    "kind": "promo"
   },
   {
    "date": "2026-12-28",
    "what": "Amex Platinum statement",
    "amount": 4531.43
   },
   {
    "date": "2026-12-31",
    "what": "Property tax (Mom's gift); Schwab check",
    "amount": 15000,
    "inflow": 6750
   },
   {
    "date": "2027-01-04",
    "what": "PayPal Credit ···0646 deferred interest, first part",
    "amount": 332,
    "account": "paypal_0646",
    "kind": "promo"
   },
   {
    "date": "2027-02-04",
    "what": "PayPal Credit ···0646 deferred interest, rest",
    "amount": 179,
    "account": "paypal_0646",
    "kind": "promo"
   },
   {
    "date": "2027-03-15",
    "what": "2026 federal tax refund → cards",
    "inflow": 9800
   },
   {
    "date": "2027-06-18",
    "what": "Citi Diamond ···4205 promo ends (19.74% after)",
    "amount": 11411,
    "account": "citi_diamond_4205",
    "kind": "promo"
   },
   {
    "date": "2027-10-18",
    "what": "BofA ···1205 promo ends (~25% after)",
    "amount": 19653,
    "account": "bofa_1205",
    "kind": "promo"
   },
   {
    "date": "2028-03-15",
    "what": "First bonus (net) → clears the cards",
    "inflow": 37350
   },
   {
    "date": "2028-04-01",
    "what": "HELOC moves to a 20-year payment (~$1,423)",
    "amount": 1423
   }
  ],
  "tradeoffs": [
   {
    "path": "Recommended: Max, bonus 50/50 from 2029",
    "month_2027": -17,
    "savings_2029": 35675,
    "debt_2029": 124785,
    "debt_free": "2033-10",
    "interest": 54142,
    "recommended": true
   },
   {
    "path": "All bonuses to debt",
    "month_2027": -17,
    "savings_2029": 20000,
    "debt_2029": 108251,
    "debt_free": "2032-03",
    "interest": 43874
   },
   {
    "path": "Ramp (5% in 2027), bonus 50/50",
    "month_2027": 784,
    "savings_2029": 34655,
    "debt_2029": 112210,
    "debt_free": "2033-03",
    "interest": 49589
   },
   {
    "path": "Live now (C), consolidate, windfalls to cash",
    "month_2027": -571,
    "savings_2029": 79236,
    "debt_2029": 217904,
    "debt_free": "2048-04",
    "interest": 192064
   }
  ],
  "next_60_days": [
   "Line up 0% transfers now (Chase Freedom Unlimited promo ends Dec 9). Rule: nothing above 7-8%.",
   "Pay Chase Freedom ($2,724) by Dec 12 and Best Buy ($660) by Dec 27.",
   "Use Mom's $15,000 for the Dec 31 property tax.",
   "Elect Max for 2027 once the IRS announces the limit; HSA $950; name beneficiaries.",
   "Submit a new W-4 for itemizing (confirm with a CPA).",
   "Shop the lease: target $1,100, 15,000 miles a year, trade-in for drive-off.",
   "Cancel flagged subscriptions; Sonic internet; electricity plan; State Farm quote; IRS transcripts; TWC appeal."
  ],
  "risks": [
   "Bonus below target: each 10% is about $3,700 net.",
   "0% card not approved or limit too low (BofA $19,653 matters most): fall back to the HELOC at 6.85%, never 25%.",
   "Property tax bill above $15,000.",
   "2027 401(k) limit at $25,000 instead of $25,500."
  ],
  "excluded_accounts": [
   {
    "match": {
     "last4": "5007"
    },
    "reason": "Amex Gold: paid in full monthly"
   },
   {
    "match": {
     "last4": "3002"
    },
    "reason": "Amex Platinum: paid in full monthly"
   },
   {
    "match": {
     "last4": "9313"
    },
    "reason": "Chase Prime Visa: statement balance paid in full (Equal Pay plans inside)"
   }
  ],
  "months": ["2026-12","2027-01","2027-02","2027-03","2027-04","2027-05","2027-06","2027-07","2027-08","2027-09","2027-10","2027-11","2027-12","2028-01","2028-02","2028-03","2028-04","2028-05","2028-06","2028-07","2028-08","2028-09","2028-10","2028-11","2028-12","2029-01","2029-02","2029-03","2029-04","2029-05","2029-06","2029-07","2029-08","2029-09","2029-10","2029-11","2029-12"],
  "accounts": [
   {
    "key": "chase_4628",
    "label": "Chase Freedom ···4628",
    "match": {
     "last4": "4628"
    },
    "start": 2723.94,
    "rate_after": 0.2524,
    "promo_ends": "2026-12-12",
    "min": 40,
    "deferred_interest": 0,
    "order": 1
   },
   {
    "key": "chase_7117",
    "label": "Chase Freedom Unlimited ···7117",
    "match": {
     "last4": "7117"
    },
    "start": 3574.0,
    "rate_after": 0.2624,
    "promo_ends": "2026-12-09",
    "min": 40,
    "deferred_interest": 0,
    "order": 2
   },
   {
    "key": "citi_bestbuy_4802",
    "label": "Citi Best Buy ···4802",
    "match": {
     "last4": "4802"
    },
    "start": 660.4,
    "rate_after": 0.2999,
    "promo_ends": "2026-12-27",
    "min": 29,
    "deferred_interest": 312,
    "order": 3
   },
   {
    "key": "paypal_0646",
    "label": "PayPal Credit ···0646",
    "match": {
     "last4": "0646"
    },
    "start": 510.91,
    "rate_after": 0.2999,
    "promo_ends": "2027-02-04",
    "min": 25,
    "deferred_interest": 0,
    "order": 4
   },
   {
    "key": "citi_diamond_4205",
    "label": "Citi Diamond ···4205",
    "match": {
     "last4": "4205"
    },
    "start": 11411.0,
    "rate_after": 0.1974,
    "promo_ends": "2027-06-18",
    "min": 114,
    "deferred_interest": 0,
    "order": 5
   },
   {
    "key": "bofa_1205",
    "label": "BofA BankAmericard ···1205",
    "match": {
     "last4": "1205"
    },
    "start": 19653.06,
    "rate_after": 0.25,
    "promo_ends": "2027-10-18",
    "min": 200,
    "deferred_interest": 0,
    "order": 6
   },
   {
    "key": "rollover_0pct",
    "label": "0% rollover card (new)",
    "match": {
     "name": "rollover"
    },
    "start": 0.0
   },
   {
    "key": "virginia_fcu",
    "label": "Virginia FCU loan (via Dad)",
    "match": {
     "name": "virginia"
    },
    "start": 17481.27
   },
   {
    "key": "heloc",
    "label": "Credit Union of Texas HELOC",
    "match": {
     "category": "HELOC"
    },
    "start": 185718.4
   },
   {
    "key": "rh",
    "label": "RH Credit Card (Synchrony)",
    "match": {
     "name": "rh credit"
    },
    "start": 13853.12
   },
   {
    "key": "ut_southwestern",
    "label": "UT Southwestern payment plan",
    "match": {
     "name": "ut southwestern"
    },
    "start": 1192.41
   },
   {
    "key": "apple_installments",
    "label": "Apple Card installments",
    "match": {
     "name": "apple card installments"
    },
    "start": 899.76
   }
  ],
  "projection": {
   "A": {
    "debt": [252698,250205,248949,237890,236629,235365,234126,232857,231586,230312,228960,225954,222945,221175,219402,180276,179316,178352,177383,176409,175430,174447,173459,171214,168957,167916,166869,147142,144978,142802,140615,138417,136206,133984,131750,128277,124785],
    "cards": [34312,32581,32089,21796,21224,20652,20080,19421,18762,18104,17370,14984,12598,11453,10228,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "savings": [500,1000,1500,2000,2500,3000,3500,4000,4500,5000,5000,5000,5000,5000,5000,5000,6000,7000,8000,9000,10000,11000,12000,13000,14000,15000,16000,35675,35675,35675,35675,35675,35675,35675,35675,35675,35675],
    "interest": [1230,1228,1225,1223,1220,1218,1215,1213,1210,1207,1205,1202,1200,1197,1194,1192,1008,1003,998,994,989,984,979,974,962,950,945,940,828,817,805,793,782,770,758,746,727],
    "accounts": {
     "chase_4628": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "chase_7117": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "citi_bestbuy_4802": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "paypal_0646": [486,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "citi_diamond_4205": [11297,10283,10021,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "bofa_1205": [19453,19253,19053,18812,18270,17727,17184,16554,15924,15294,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "rollover_0pct": [3076,3045,3015,2985,2955,2925,2896,2867,2838,2810,17370,14984,12598,11453,10228,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "virginia_fcu": [17280,17077,16873,16668,16461,16253,16043,15831,15619,15404,15188,14971,14752,14531,14309,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "heloc": [185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,171457,170825,170189,169550,168908,168261,167611,166958,165049,163129,162425,161717,142330,140507,138674,136831,134977,133112,131237,129351,126227,123086],
     "rh": [13542,13230,12917,12603,12288,11972,11655,11336,11017,10697,10375,10053,9729,9405,9079,8752,8424,8095,7765,7434,7102,6768,6434,6098,5761,5424,5085,4745,4403,4061,3717,3373,3027,2680,2332,1983,1632],
     "ut_southwestern": [1112,1032,951,871,791,710,630,549,469,389,308,228,148,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67],
     "apple_installments": [733,567,400,233,147,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    }
   },
   "B": {
    "debt": [251943,248717,246728,234936,232942,230945,228973,226971,224967,222960,221169,217930,214438,212035,209628,169870,168218,166557,164887,163209,161522,159827,158122,155157,152175,150405,148625,128161,125256,122335,119398,116445,113476,110491,107490,103246,98978],
    "cards": [33557,31093,29868,18842,17537,16232,14927,13535,12143,10752,9579,6960,4091,2313,455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "savings": [250,500,750,1000,1250,1500,1750,2000,2250,2500,2750,3000,3000,3000,3000,3000,4000,5000,6000,7000,8000,9000,10000,11000,12000,13000,14000,33675,33675,33675,33675,33675,33675,33675,33675,33675,33675],
    "interest": [1230,1228,1225,1223,1220,1218,1215,1213,1210,1207,1205,1202,1200,1197,1194,1192,948,940,931,922,914,905,896,887,871,855,845,836,720,704,688,672,656,640,624,608,584],
    "accounts": {
     "chase_4628": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "chase_7117": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "citi_bestbuy_4802": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "paypal_0646": [486,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "citi_diamond_4205": [11297,9544,8544,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "bofa_1205": [19453,19253,19053,16596,15316,14036,12756,11389,10022,8656,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "rollover_0pct": [2321,2296,2271,2246,2221,2196,2171,2146,2121,2096,9579,6960,4091,2313,455,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "virginia_fcu": [17280,17077,16873,16668,16461,16253,16043,15831,15619,15404,15188,14971,14752,14531,14309,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "heloc": [185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,161050,159726,158394,157055,155708,154353,152991,151621,148991,146347,144914,143473,123349,120785,118206,115613,113005,110382,107744,105091,101196,97278],
     "rh": [13542,13230,12917,12603,12288,11972,11655,11336,11017,10697,10375,10053,9729,9405,9079,8752,8424,8095,7765,7434,7102,6768,6434,6098,5761,5424,5085,4745,4403,4061,3717,3373,3027,2680,2332,1983,1632],
     "ut_southwestern": [1112,1032,951,871,791,710,630,549,469,389,308,228,148,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67],
     "apple_installments": [733,567,400,233,147,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    }
   },
   "C": {
    "debt": [256677,255506,254346,243235,242159,241082,240048,239161,238272,237381,237011,236137,235262,234387,233593,195387,194377,193362,192455,191755,191051,190344,189634,188921,188204,187484,186761,145368,144406,143439,142468,141492,140511,139525,138535,137539,136539],
    "cards": [38291,37881,37485,27141,26755,26368,26003,25725,25448,25172,25421,25167,24915,24666,24419,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "savings": [3309,4076,4076,3000,3000,3000,2896,2723,2551,2380,2210,2287,3367,3367,3367,3000,3000,3000,3000,3000,3000,3000,3072,4457,5842,6000,6158,3000,3158,3316,3474,3632,3790,3947,4105,5490,6875],
    "interest": [1230,1228,1225,1223,1220,1218,1215,1213,1210,1207,1205,1202,1200,1197,1194,1192,1095,1090,1084,1080,1076,1073,1070,1067,1064,1060,1057,1054,818,813,809,804,799,794,790,785,780],
    "accounts": {
     "chase_4628": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "chase_7117": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "citi_bestbuy_4802": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "paypal_0646": [486,461,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "citi_diamond_4205": [11297,11183,11069,999,885,771,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "bofa_1205": [19453,19253,19053,18853,18653,18453,18253,18053,17853,17653,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "rollover_0pct": [7055,6984,7363,7290,7217,7145,7750,7672,7595,7519,25421,25167,24915,24666,24419,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "virginia_fcu": [17280,17077,16873,16668,16461,16253,16043,15831,15619,15404,15188,14971,14752,14531,14309,850,531,209,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     "heloc": [185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185718,185355,184990,184623,184254,183882,183509,183133,182755,182375,181993,181609,140556,139936,139311,138683,138052,137417,136778,136135,135489,134839],
     "rh": [13542,13230,12917,12603,12288,11972,11655,11336,11017,10697,10375,10053,9729,9405,9079,8752,8424,8095,7765,7434,7102,6768,6434,6098,5761,5424,5085,4745,4403,4061,3717,3373,3027,2680,2332,1983,1632],
     "ut_southwestern": [1112,1032,951,871,791,710,630,549,469,389,308,228,148,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67,67],
     "apple_installments": [733,567,400,233,147,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    }
   }
  }
 }
}
$plan$::jsonb)
  || jsonb_build_object('assumptions', coalesce(value->'assumptions', '{}'::jsonb) || $a$
{
 "pay_frequency": "semi-monthly (24 checks: 15th and last day)",
 "base_salary": 240000,
 "net_per_check_5pct": 6787,
 "net_per_check_10pct": 6432,
 "net_per_check_max_401k": 6386,
 "take_home_month_5pct": 13573,
 "take_home_month_10pct": 12864,
 "take_home_month_max_401k": 12773,
 "w4_itemizing_monthly": 300,
 "take_home_month_plan": 13073,
 "bonus_net": 37350,
 "first_bonus": "2028-03",
 "bonus_share_to_debt_from_2029_pct": 50,
 "refund_2026": 9800,
 "refund_2027_taxyear": 3600,
 "irs_2022_refund_unconfirmed": 5000,
 "mom_gift_property_tax": 15000,
 "lease_payment": 1100,
 "lease_insurance_increase": 200,
 "lease_term_months": 36,
 "car_target_purchase": "2027-02",
 "heloc_amortize_from": "2028-04",
 "heloc_term_years": 20,
 "heloc_payment_amortizing": 1423,
 "savings_phase1": "$500/mo to $5,000",
 "savings_phase2": "$1,000/mo to $20,000 from 2028-04",
 "rate_ceiling_pct": "7 to 8",
 "balance_transfer_fee_pct": 3,
 "rollover_0pct_months": 18,
 "amex_mr_points": 500000,
 "amex_points_cash_value": 5500,
 "property_tax": 15000,
 "property_tax_setaside_monthly": 1250,
 "property_tax_pay_by": "2026-12-31",
 "emergency_target": {
  "A": 5000,
  "B": 3000
 }
}
$a$::jsonb)
where key = 'strategic_plan';

