# Phase 3B: Health & Wellness Modules PRD

**Owner:** Brandon Micci | **Version:** 1.0 | **Date:** March 17, 2026
**Status:** Ready to Build | **Priority:** MEDIUM
**Depends On:** Phase 0 (Foundation Refactor)

---

## 1. Purpose

Enhance the existing Health page from a read-only supplement/protocol display into a comprehensive health management hub with appointment tracking, lab result trends, fitness logging, and skincare routine management.

## 2. Current State

The current `/health` route (`health/page.tsx`) fetches from two Supabase tables:
- `supplements` — grouped by category (Foundation, Hormonal Support, Performance, etc.)
- `hormone_protocols` — TRT protocol with substance, dosage, day_of_week, time_of_day

The UI displays supplements as grouped cards and protocols as a simple list. The Supabase schema also has `lab_markers`, `workouts`, `body_metrics`, and `daily_schedule` tables — but no UI exists for these yet.

## 3. Route Structure

```
/health                    — Hub page with sub-navigation
/health/protocols          — Protocol tracker + compliance logging
/health/labs               — Lab results tracker + trend charts
/health/fitness            — Fitness tracker + body metrics
/health/skincare           — Skincare & grooming regime
```

---

## 4. Module 3B-1: Protocol Tracker Enhancement

**Route:** `/health/protocols`
**Supabase Tables:** `hormone_protocols` (exists), `protocol_compliance` (new)

### What Exists
Static display of TRT protocol items with dosage and schedule.

### What's Being Added

**Active Protocols (from Platform Migration PRD):**

| Protocol | Dosage | Frequency | Day(s) |
|---|---|---|---|
| Testosterone Cypionate | 200mg IM injection | Weekly | Monday |
| HCG | 250 IU SubQ | 2x/week | Wednesday, Saturday |
| Anastrozole | 1mg oral | Weekly | Wednesday |
| BPC-157 + TB-500 (planned) | TBD | Daily (phased) | TBD |
| CJC-1295 + Ipamorelin (planned) | TBD | 5 days on / 2 off | TBD |
| GHK-Cu topical (planned) | TBD | Daily | TBD |
| Semax intranasal (planned) | TBD | Daily | TBD |

**Features:**
- **Daily checklist:** Mark each protocol item as done → builds compliance streak
- **Compliance streak counter:** Consecutive days of completing all items
- **Trough timing calculator:** Based on last injection date, shows optimal lab draw window (for testosterone: 6–7 days post-injection for trough)
- **Injection site rotation tracker:** Track IM and SubQ injection sites to ensure proper rotation
- **Supply inventory:** Track vial quantities, reorder alerts when running low
- **Provider info card:** Prescribing physician (Dr. Padilla), pharmacy, next follow-up date

**New Table:**
```sql
CREATE TABLE protocol_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  protocol_id UUID REFERENCES hormone_protocols(id) NOT NULL,
  completed_date DATE NOT NULL,
  injection_site TEXT, -- e.g., 'left_delt', 'right_glute', 'left_abdomen'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, protocol_id, completed_date)
);

ALTER TABLE protocol_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own compliance" ON protocol_compliance
  FOR ALL USING (auth.uid() = user_id);

-- Supply inventory
CREATE TABLE protocol_supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  protocol_id UUID REFERENCES hormone_protocols(id),
  product_name TEXT NOT NULL,
  quantity_remaining NUMERIC,
  unit TEXT, -- 'ml', 'tablets', 'vials'
  reorder_threshold NUMERIC,
  supplier TEXT,
  last_ordered DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE protocol_supplies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own supplies" ON protocol_supplies
  FOR ALL USING (auth.uid() = user_id);
```

---

## 5. Module 3B-2: Lab Results Tracker

**Route:** `/health/labs`
**Supabase Table:** `lab_markers` (exists — needs data population)

### Features

- **Lab result entry:** Manual input form with test name, date, value, unit, reference range, provider
- **Trend charts:** Plot any lab value over time as a line chart (Recharts)
- **Reference range visualization:** Horizontal bar showing where the value falls within the reference range
- **Color-coded flags:** Red = out of range, Amber = borderline (within 10% of range boundary), Green = normal
- **Key labs to track:** Total T, Free T, Estradiol (E2), SHBG, Hematocrit, PSA, Lipid Panel (LDL, HDL, Triglycerides, Total Cholesterol), CMP, CBC, Thyroid Panel (TSH, T3, T4), Vitamin D, B12, Iron/Ferritin

### Data Model (existing `lab_markers` table — verify schema matches)

```sql
-- Expected schema (update if different)
CREATE TABLE IF NOT EXISTS lab_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  test_name TEXT NOT NULL,
  test_date DATE NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  reference_min NUMERIC,
  reference_max NUMERIC,
  provider TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### UI Layout

```
┌─────────────────────────────────────┐
│ Lab Results                         │
├─────────────────────────────────────┤
│ [+ Add Result]  [Filter by test ▼] │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Testosterone (Total)            │ │
│ │ Latest: 850 ng/dL  ● In Range  │ │
│ │ ▁▂▃▅▆█▇▅▆▇█  (trend sparkline) │ │
│ │ Range: [300 ██████████████ 1000]│ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Estradiol (E2)                  │ │
│ │ Latest: 32 pg/mL  ● In Range   │ │
│ │ ▃▅▇█▆▃▂▃▅▆  (trend sparkline)  │ │
│ │ Range: [15 ████████████████ 60] │ │
│ └─────────────────────────────────┘ │
│ ... more lab cards ...              │
└─────────────────────────────────────┘
```

Clicking any card expands to a full trend chart with all historical values plotted.

---

## 6. Module 3B-3: Fitness Tracker

**Route:** `/health/fitness`
**Supabase Tables:** `workouts` (exists), `body_metrics` (exists)

### Features

- **Weekly workout calendar:** 5 days/week training schedule with workout type per day
- **ClassPass integration notes:** which classes booked, studio, time (manual entry)
- **Body metrics log:** weight, body fat %, measurements (tracked monthly)
- **IR sauna session log:** frequency, duration
- **Progress photos:** monthly upload with side-by-side comparison (Supabase Storage)
- **Streak tracker:** consecutive days/weeks of hitting workout target
- **Goal integration:** links to health domain goals in Goals Tracker

### Data Notes

The existing `workouts` and `body_metrics` tables should have:
```sql
-- workouts: date, workout_type, duration_minutes, notes, calories_burned
-- body_metrics: date, weight, body_fat_pct, notes
```

**Add progress photos table:**
```sql
CREATE TABLE progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  photo_date DATE NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('front', 'side', 'back')) DEFAULT 'front',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own photos" ON progress_photos
  FOR ALL USING (auth.uid() = user_id);
```

---

## 7. Module 3B-4: Skincare & Grooming Regime

**Route:** `/health/skincare`
**Supabase Table:** `skincare_routine` (new)

### Features

- **AM Routine checklist:** ordered list of morning skincare steps with product names
- **PM Routine checklist:** ordered list of evening skincare steps
- **Weekly treatments:** masks, exfoliants, special treatments on specific days
- **Product inventory:** track products with purchase date, estimated replacement date
- **Reorder alerts:** visual indicator when a product is approaching depletion
- **Routine editor:** add/remove/reorder steps, swap products
- **Before/after tracking:** periodic skin photos with date stamps (reuse progress_photos with new type)

### Data Model

```sql
CREATE TABLE skincare_routine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  step_name TEXT NOT NULL,
  product_name TEXT,
  product_brand TEXT,
  time_of_day TEXT CHECK (time_of_day IN ('am', 'pm', 'both')) NOT NULL,
  frequency TEXT CHECK (frequency IN ('daily', 'every_other_day', 'weekly', 'as_needed')) DEFAULT 'daily',
  day_of_week TEXT[], -- for weekly items: ['monday', 'thursday']
  step_order INTEGER NOT NULL,
  category TEXT CHECK (category IN (
    'cleanser', 'toner', 'serum', 'moisturizer', 'spf',
    'treatment', 'mask', 'eye_cream', 'lip', 'body'
  )),
  purchased_date DATE,
  est_replacement_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skincare_routine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own skincare" ON skincare_routine
  FOR ALL USING (auth.uid() = user_id);
```

---

## 8. Build Order

| Step | Task | Duration | Depends On |
|---|---|---|---|
| 3B.0 | Create /health sub-routes and hub navigation | 0.5 days | Phase 0 |
| 3B.1 | Protocol tracker: daily checklist + compliance streak | 1.5 days | 3B.0 |
| 3B.2 | Protocol tracker: supply inventory + trough calculator | 1 day | 3B.1 |
| 3B.3 | Lab results: entry form + trend charts + range viz | 2 days | 3B.0 |
| 3B.4 | Fitness tracker: workout calendar + body metrics + streak | 1.5 days | 3B.0 |
| 3B.5 | Progress photos: upload + side-by-side view | 1 day | 3B.4 |
| 3B.6 | Skincare: AM/PM checklists + product inventory | 1.5 days | 3B.0 |

**Total: ~2 weeks**

## 9. Acceptance Criteria

- [ ] Protocol tracker: daily checklist works, compliance streak counts correctly
- [ ] Protocol tracker: trough timing calculator shows correct lab draw window
- [ ] Lab results: can add results manually, trend charts render with reference ranges
- [ ] Lab results: out-of-range values flagged with color coding
- [ ] Fitness tracker: weekly calendar shows workout schedule, streak counts correctly
- [ ] Fitness tracker: body metrics can be logged and viewed over time
- [ ] Skincare: AM/PM routines display in correct order, can be reordered
- [ ] Skincare: product inventory shows reorder alerts
- [ ] All modules: data persists in Supabase with RLS
- [ ] All modules: mobile-responsive
