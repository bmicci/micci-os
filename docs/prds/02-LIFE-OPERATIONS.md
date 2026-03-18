# Phase 2: Life Operations Modules PRD

**Owner:** Brandon Micci | **Version:** 1.0 | **Date:** March 17, 2026
**Status:** Ready to Build | **Priority:** MEDIUM — builds on existing features
**Depends On:** Phase 0 (Foundation Refactor)

---

## 1. Purpose

Enhance the existing Task Manager, Planner, and Goals modules with the features specified in the Platform Migration PRD. The current codebase has working versions of all three — this phase upgrades them from date-specific tools (March 2026 command center) into permanent, month-agnostic life operations systems.

## 2. Current State vs. Target

| Feature | Current State | Target State |
|---|---|---|
| Task Manager | March-specific checklist in PlannerApp (ChecklistTab) | Month-agnostic command center with categories, recurring tasks, overdue tracking |
| Weekly Planner | 33-day hardcoded schedule (Feb 27–Mar 31) in planner-data.ts | Dynamic week view with Google Calendar sync, time-blocked scheduling |
| Goals Tracker | 300+ static life goals in life-plan-data.ts with completion tracking | Same foundation + quarterly reviews, goal→task linking, progress rings |
| Vision Board | VisionBoardView.tsx — read-only category display | Interactive freeform canvas with drag-drop, image upload, export to PNG |

---

## 3. Module 2A: Task Manager / Command Center

**Route:** `/tasks` (new route — currently tasks live inside `/planner`)
**Supabase Table:** `tasks` (exists but needs schema update)

### What Changes

The current `ChecklistTab.tsx` and `BacklogTab.tsx` inside PlannerApp handle tasks. These get extracted into a standalone `/tasks` route with a richer data model.

### Features

- **Month selector** with auto-generated week structure (W1–W5 based on calendar days)
- **Day cards** with tasks, overdue indicators, and per-day progress bars
- **Category filter pills:** Job Search, Tax, Health/Benefits, Legal, HELOC, Finance, Personal, Career
- **Task CRUD:** add, edit, check off, delete, reschedule (drag to different day via @dnd-kit — already installed)
- **Hard deadlines footer** with countdown timers (pulls from `deadlines` table created in Phase 0 + custom deadlines)
- **Overdue rollover:** uncompleted tasks from past days automatically flag as overdue
- **Recurring task support:** daily, weekly, monthly recurrence rules

### Updated Data Model

```sql
-- Update existing tasks table or create if needed
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT CHECK (category IN (
    'job_search', 'tax', 'health', 'legal', 'heloc', 'finance', 'personal', 'career'
  )) DEFAULT 'personal',
  status TEXT CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')) DEFAULT 'pending',
  scheduled_date DATE,
  due_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- 'daily', 'weekly', 'monthly', or cron-like
  linked_goal_id UUID REFERENCES life_plan_goals(id),
  linked_deadline_id UUID REFERENCES deadlines(id),
  calendar_event_id TEXT, -- Google Calendar event ID (Phase 2B)
  notes TEXT DEFAULT '',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);
```

### UI Layout

```
┌─────────────────────────────────────────────────┐
│ March 2026                    ◀ ▶  [Month Picker]│
├─────────────────────────────────────────────────┤
│ [All] [Job] [Tax] [Health] [Legal] [HELOC] ...  │  ← Category pills
├─────────────────────────────────────────────────┤
│ Week 1 (Mar 1–7)                                │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│ │ Mon  │ │ Tue  │ │ Wed  │ │ Thu  │ │ Fri  │  │
│ │ 3/1  │ │ 3/2  │ │ 3/3  │ │ 3/4  │ │ 3/5  │  │
│ │ □ .. │ │ □ .. │ │ □ .. │ │ □ .. │ │ □ .. │  │
│ │ □ .. │ │      │ │ □ .. │ │      │ │      │  │
│ │ 2/3  │ │ 0/1  │ │ 1/2  │ │ 0/0  │ │ 0/1  │  │  ← progress
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
├─────────────────────────────────────────────────┤
│ Week 2 (Mar 8–14) ...                           │
├─────────────────────────────────────────────────┤
│ ⚠ Hard Deadlines                                │
│ HELOC Close: Mar 19 (2 days) │ Tax: Apr 15 (29d)│
└─────────────────────────────────────────────────┘
```

---

## 4. Module 2B: Weekly Planner + Google Calendar Sync

**Route:** `/planner` (existing — enhance in place)
**Supabase Tables:** `schedule_blocks`, `schedule_completions`, `calendar_events` (new)

### What Changes

The current `PlannerApp.tsx` has 7 tabs (Schedule, Agenda, Sleep, Fitness, Checklist, Rules, Backlog). The Schedule and Agenda tabs get upgraded to a time-blocked weekly view that integrates with Google Calendar. The other tabs (Sleep, Fitness, Rules) stay as-is initially and get enhanced in Phase 3B (Health).

### Features

- **Week-at-a-glance** layout with hourly time blocks (7am–10pm)
- **Tasks from Task Manager** appear as draggable blocks (assign to time slots)
- **Google Calendar events** rendered as fixed blocks (color-coded by calendar)
- **Day theme/focus label** at top of each day column (customizable text)
- **Quick-add:** click any empty time slot to create a task or event
- **Morning/evening routine templates** (recurring blocks)
- **Today indicator** with current time marker line
- **Mobile:** swipe between days, today view as default

### Google Calendar Sync — 3-Phase Approach

**Phase 2B-1: Read-Only Pull**
- Google OAuth via Supabase Auth (Google provider already configured)
- Next.js API route at `/api/calendar/sync` fetches events using `googleapis` package
- Events stored in `calendar_events` table with `google_event_id` for dedup
- Pull runs on planner page load + manual refresh button
- Events display as read-only colored blocks in the weekly view

**Phase 2B-2: Push**
- Tasks with scheduled times can be pushed to Google Calendar
- "Add to Calendar" button on individual tasks
- Creates Google Calendar event and stores `google_event_id` back on the task

**Phase 2B-3: Two-Way Sync**
- Webhook or polling-based sync (Google Calendar push notifications)
- Conflict detection: if event moved in Google, update local; if moved locally, update Google
- Sync status indicator in planner UI

### New Supabase Table

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  google_event_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  calendar_name TEXT, -- which Google Calendar
  calendar_color TEXT, -- hex color for display
  is_all_day BOOLEAN DEFAULT false,
  location TEXT,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);
```

### New API Route

```
app/api/calendar/
├── sync/route.ts       — Pull events from Google Calendar
├── push/route.ts       — Push task to Google Calendar
└── webhook/route.ts    — Receive Google Calendar change notifications (Phase 2B-3)
```

---

## 5. Module 3A: Goals Tracker Enhancements

**Route:** `/goals` (existing — enhance in place)
**Supabase Tables:** `life_plan_goals`, `life_plan_goal_states`, `life_plan_custom_goals`

### What Exists

The current Goals system is comprehensive — 300+ static goals across 10 life domains (Health, Career, Finance, Relationships, Personal Development, Home/Lifestyle, Spiritual, Public Service, Experiences, Education). Goals are grouped by timeframe (Age 40, 45, 50, 60). Completion tracking via `life_plan_goal_states` table. Custom goal creation via modal.

### What's Being Added

**1. Progress Rings**
- Each goal gets a visual progress ring (0–100%) instead of just a checkbox
- Progress can be manually set or auto-calculated from milestones

**2. Milestone Tracking**
- Sub-goals within each goal (stored as JSONB array on the goal)
- Individual completion status per milestone
- Progress ring auto-calculates from milestone completion percentage

**3. Quarterly Review Prompt**
- System nudges a goal review every 90 days
- Review modal: for each active goal, confirm status (on track, behind, pivoted, dropped)
- Review history stored for year-over-year comparison

**4. Goal → Task Linking**
- Any goal can generate a task in the Task Manager
- "Create task from goal" button on goal cards
- Tasks linked back to goals via `linked_goal_id` foreign key
- Completing linked tasks updates goal progress

**5. Domain Color System**
(Per Platform Migration PRD)

| Domain | Color | Hex |
|---|---|---|
| Career | Blue | #60A5FA |
| Relationships & Family | Pink | #F472B6 |
| Finance | Green | #4ADE80 |
| Health & Fitness | Teal | #34D399 |
| Personal Development | Amber | #FBBF24 |
| Home & Lifestyle | Purple | #A78BFA |
| Spiritual | Rose | #F9A8D4 |
| Public Service | Orange | #FB923C |

---

## 6. Module 3A-V: Vision Board Enhancement

**Route:** `/goals/vision` (sub-route of goals)
**Supabase Tables:** `vision_board_items` (new)

### What Exists

`VisionBoardView.tsx` currently renders a read-only category overview of goals.

### Target

Interactive freeform canvas with drag-and-drop positioning using `react-konva` or `@dnd-kit`.

**Features:**
- Category cards organized by life domain with icons and gradient accents
- Image upload (to Supabase Storage) for personal photos, screenshots, inspiration
- Affirmation text blocks with editable content
- Milestone badges auto-added when goals from Goals Tracker are completed
- Inspirational quotes (rotating or pinned)
- Export to PNG for phone wallpaper or printing
- Yearly refresh: archive previous year's board, start fresh

**New Table:**
```sql
CREATE TABLE vision_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category TEXT, -- life domain
  content_type TEXT CHECK (content_type IN ('image', 'text', 'quote', 'badge', 'goal_link')),
  content TEXT, -- text content or image URL
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 200,
  height NUMERIC DEFAULT 200,
  style_json JSONB DEFAULT '{}', -- font, color, etc.
  linked_goal_id UUID REFERENCES life_plan_goals(id),
  board_year INTEGER DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vision_board_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own vision board" ON vision_board_items
  FOR ALL USING (auth.uid() = user_id);
```

---

## 7. Build Order

| Step | Task | Duration | Depends On |
|---|---|---|---|
| 2A.1 | Extract tasks from PlannerApp into standalone /tasks route | 1 day | Phase 0 |
| 2A.2 | Task CRUD with category pills and month navigation | 2 days | 2A.1 |
| 2A.3 | Overdue rollover logic + recurring tasks | 1 day | 2A.2 |
| 2A.4 | Hard deadlines footer (pull from deadlines table) | 0.5 days | 2A.2 |
| 2B.1 | Google Calendar OAuth + /api/calendar/sync endpoint | 1 day | Phase 0 |
| 2B.2 | Planner weekly time-block view with calendar events | 2 days | 2B.1 |
| 2B.3 | Task → calendar push (Phase 2B-2) | 1 day | 2B.1 + 2A.2 |
| 3A.1 | Goals progress rings + milestone tracking | 1.5 days | Phase 0 |
| 3A.2 | Goal → Task linking | 0.5 days | 2A.2 + 3A.1 |
| 3A.3 | Quarterly review prompt system | 1 day | 3A.1 |
| 3A-V | Vision Board interactive canvas + image upload | 3 days | 3A.1 |

**Total: ~2–3 weeks**

## 8. Acceptance Criteria

- [ ] Task Manager: Month navigation works for any month, not just March 2026
- [ ] Task Manager: Categories filter correctly, overdue tasks auto-flag
- [ ] Task Manager: Recurring tasks generate next instance on completion
- [ ] Planner: Google Calendar events appear in weekly view (read-only)
- [ ] Planner: Tasks can be dragged to time slots
- [ ] Goals: Progress rings display and update correctly from milestones
- [ ] Goals: "Create task from goal" generates a linked task
- [ ] Vision Board: Items can be positioned via drag-and-drop
- [ ] Vision Board: Images upload to Supabase Storage and display
- [ ] Vision Board: Export to PNG works
- [ ] All modules: Mobile-responsive (375px minimum)

## 9. New Dependencies

| Package | Purpose |
|---|---|
| `googleapis` | Google Calendar API |
| `react-konva` or `fabricjs` | Vision Board canvas (evaluate both — react-konva is React-native, fabricjs is more mature) |
| `html-to-image` or `html2canvas` | Vision Board PNG export |
