# Phase 3C: Career Modules PRD

**Owner:** Brandon Micci | **Version:** 1.0 | **Date:** March 17, 2026
**Status:** Ready to Build | **Priority:** MEDIUM
**Depends On:** Phase 0 (Foundation Refactor)

---

## 1. Purpose

Build two career management modules for the post-JPMC job search period: a KPI dashboard for tracking search activity against targets, and a lightweight CRM for managing professional contacts and follow-ups.

## 2. Current State

The current codebase does not have dedicated career routes, but the Platform Migration PRD references a Vue-era "March Command Center KPI view" that tracked job search metrics. The new modules are a generalized, month-agnostic rebuild.

---

## 3. Module 3C-1: Job Search KPI Dashboard

**Route:** `/career/kpis`
**Supabase Table:** `kpi_metrics` (referenced in Platform PRD schema)

### Features

- **4 core metrics** with progress bars vs. monthly targets:
  - Applications Submitted
  - Recruiter Conversations
  - Interviews Scheduled
  - Networking Calls

- **Weekly input grid:** enter actual counts per week (W1–W4/W5), progress bars update live
- **Monthly history:** view past months' KPI performance with trend lines
- **Target adjustment:** change monthly targets as search phase evolves (early = volume, late = quality)
- **Trend line:** month-over-month activity line chart
- **Pipeline view:** active opportunities with stage tracking:
  - Applied → Phone Screen → Interview → Final Round → Offer → Rejected
  - Each opportunity: company, role, date applied, current stage, next action, notes

### Data Model

```sql
CREATE TABLE kpi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  week INTEGER NOT NULL, -- 1-5
  metric_type TEXT CHECK (metric_type IN (
    'applications', 'recruiter_calls', 'interviews', 'networking_calls'
  )) NOT NULL,
  actual_count INTEGER DEFAULT 0,
  target_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year, month, week, metric_type)
);

ALTER TABLE kpi_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own KPIs" ON kpi_metrics
  FOR ALL USING (auth.uid() = user_id);

-- Job pipeline / opportunities
CREATE TABLE job_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  company TEXT NOT NULL,
  role_title TEXT NOT NULL,
  job_url TEXT,
  salary_range TEXT, -- e.g., "$240K-$280K"
  stage TEXT CHECK (stage IN (
    'researching', 'applied', 'phone_screen', 'interview',
    'final_round', 'offer', 'accepted', 'rejected', 'withdrawn'
  )) DEFAULT 'researching',
  date_applied DATE,
  last_activity DATE,
  next_action TEXT,
  next_action_date DATE,
  recruiter_name TEXT,
  recruiter_contact TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE job_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own opportunities" ON job_opportunities
  FOR ALL USING (auth.uid() = user_id);
```

### UI Layout

```
┌─────────────────────────────────────────────────┐
│ Job Search KPIs — March 2026         [Month ▼]  │
├─────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──┐ │
│ │ Apps: 12  │ │ Recruit: 5│ │ Intrvw: 3 │ │N:│ │
│ │ ████░░ 20 │ │ ███░░░ 8  │ │ ██░░░░ 6  │ │..│ │
│ └───────────┘ └───────────┘ └───────────┘ └──┘ │
├─────────────────────────────────────────────────┤
│ Weekly Input                                     │
│       W1    W2    W3    W4                       │
│ Apps  [3]   [4]   [5]   [ ]                     │
│ Recr  [1]   [2]   [2]   [ ]                     │
│ Intv  [0]   [1]   [2]   [ ]                     │
│ Netw  [2]   [1]   [3]   [ ]                     │
├─────────────────────────────────────────────────┤
│ Pipeline (6 active)                              │
│ McKesson — VP Product — Interview — Mar 22      │
│ Celestica — Dir Ops — Phone Screen — Mar 20     │
│ ...                                              │
└─────────────────────────────────────────────────┘
```

---

## 4. Module 3C-2: Networking CRM

**Route:** `/career/network`
**Supabase Tables:** `contacts`, `contact_interactions` (new)

### Features

- **Contact cards:** name, company, title, email, LinkedIn URL, relationship strength (1–5 stars)
- **Interaction log:** date, type (call, email, LinkedIn, coffee, event), notes
- **Follow-up reminders:** set a follow-up date, visual indicator when overdue
- **Tag system:** recruiter, hiring_manager, peer, mentor, investor, board_member, friend
- **Search and filter** by company, tag, last contact date, relationship strength
- **Quick actions:** "Log a touchpoint", "Schedule follow-up", "View LinkedIn" (opens external link)
- **Relationship decay indicator:** contacts not reached in 30+ days show amber, 60+ days show red

### Data Model

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  relationship_strength INTEGER CHECK (relationship_strength BETWEEN 1 AND 5) DEFAULT 3,
  tags TEXT[] DEFAULT '{}', -- array of tags
  follow_up_date DATE,
  notes TEXT,
  last_contact_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE contact_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  interaction_date DATE NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN (
    'call', 'email', 'linkedin', 'coffee', 'event', 'text', 'meeting', 'other'
  )) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own interactions" ON contact_interactions
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update last_contact_date on contacts when interaction logged
CREATE OR REPLACE FUNCTION update_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts
  SET last_contact_date = NEW.interaction_date, updated_at = now()
  WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_last_contact
AFTER INSERT ON contact_interactions
FOR EACH ROW EXECUTE FUNCTION update_last_contact();
```

---

## 5. Build Order

| Step | Task | Duration | Depends On |
|---|---|---|---|
| 3C.1 | KPI dashboard: 4 metric cards + weekly input grid | 1 day | Phase 0 |
| 3C.2 | KPI dashboard: monthly history + trend chart | 0.5 days | 3C.1 |
| 3C.3 | Job pipeline: opportunity CRUD + stage tracking | 1 day | 3C.1 |
| 3C.4 | Networking CRM: contact cards + CRUD | 1 day | Phase 0 |
| 3C.5 | Networking CRM: interaction log + follow-up reminders | 1 day | 3C.4 |
| 3C.6 | Networking CRM: search/filter + relationship decay | 0.5 days | 3C.4 |

**Total: ~1 week**

## 6. Acceptance Criteria

- [ ] KPI Dashboard: 4 metrics display with progress bars against targets
- [ ] KPI Dashboard: Weekly input grid persists values to Supabase
- [ ] KPI Dashboard: Monthly history shows past months' data with trend line
- [ ] Job Pipeline: Can create, update stage, and track opportunities
- [ ] Networking CRM: Contact CRUD with all fields
- [ ] Networking CRM: Interaction logging updates last_contact_date automatically
- [ ] Networking CRM: Follow-up reminders show visual indicators when overdue
- [ ] Networking CRM: Relationship decay indicators at 30/60 day thresholds
- [ ] All modules: mobile-responsive
