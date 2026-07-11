import { createClient } from '@/lib/supabase/server'
import LifePlanClient, { type DBSection, type DBGoal } from '@/components/life-plan/LifePlanClient'
import { SECTIONS } from '@/lib/life-plan-data'

// ── Static fallback builders ───────────────────────────────────

function buildStaticSections(): DBSection[] {
  return SECTIONS
    .filter(s => !s.isVision)
    .map((s, i) => ({
      id: s.id,
      name: s.name,
      color_hex: s.colorHex,
      sort_order: i,
    }))
}

function buildStaticGoals(): DBGoal[] {
  const goals: DBGoal[] = []
  let order = 0

  for (const section of SECTIONS) {
    if (section.isVision) continue

    // Timeframe-based goals
    if (section.timeframes) {
      for (const [tfKey, tf] of Object.entries(section.timeframes)) {
        tf.categories.forEach((cat, catIdx) => {
          cat.goals.forEach((goalText, goalIdx) => {
            goals.push({
              id: `${section.id}-${tfKey}-${catIdx}-${goalIdx}`,
              section_id: section.id,
              timeframe: tfKey,
              timeframe_label: tf.label,
              category_header: cat.header,
              goal_text: goalText,
              completed: false,
              ai_generated: false,
              is_seeded: true,
              sort_order: order++,
            })
          })
        })
      }
    }

    // Pinned goals (fun section bucket list)
    if (section.pinned) {
      section.pinned.forEach((p, pIdx) => {
        p.goals.forEach((goalText, gIdx) => {
          goals.push({
            id: `${section.id}-pinned-${pIdx}-${gIdx}`,
            section_id: section.id,
            timeframe: 'pinned',
            timeframe_label: p.label,
            category_header: null,
            goal_text: goalText,
            completed: false,
            ai_generated: false,
            is_seeded: true,
            sort_order: order++,
          })
        })
      })
    }

    // All-ages goals (fun section subcategories)
    if (section.allAges) {
      section.allAges.forEach((aa, aaIdx) => {
        if (aa.goals) {
          aa.goals.forEach((goalText, gIdx) => {
            goals.push({
              id: `${section.id}-all-${aaIdx}-${gIdx}`,
              section_id: section.id,
              timeframe: 'all',
              timeframe_label: aa.label,
              category_header: null,
              goal_text: goalText,
              completed: false,
              ai_generated: false,
              is_seeded: true,
              sort_order: order++,
            })
          })
        }
        if (aa.subcategories) {
          aa.subcategories.forEach((sub, subIdx) => {
            sub.goals.forEach((goalText, gIdx) => {
              goals.push({
                id: `${section.id}-all-${aaIdx}-sub-${subIdx}-${gIdx}`,
                section_id: section.id,
                timeframe: 'all',
                timeframe_label: `${aa.label} — ${sub.header}`,
                category_header: sub.header,
                goal_text: goalText,
                completed: false,
                ai_generated: false,
                is_seeded: true,
                sort_order: order++,
              })
            })
          })
        }
      })
    }
  }

  return goals
}

// ── Page ───────────────────────────────────────────────────────

export default async function GoalsPage() {
  let sections: DBSection[] = []
  let goals: DBGoal[] = []

  try {
    const supabase = await createClient()
    const [{ data: dbSections, error: se }, { data: dbGoals, error: ge }] = await Promise.all([
      supabase.from('life_plan_sections').select('*').order('sort_order'),
      supabase.from('life_plan_goals').select('*').order('sort_order'),
    ])
    if (!se && dbSections && dbSections.length > 0) sections = dbSections
    if (!ge && dbGoals && dbGoals.length > 0) goals = dbGoals
  } catch { /* tables may not exist yet — fall back to static */ }

  if (sections.length === 0) sections = buildStaticSections()
  if (goals.length === 0) goals = buildStaticGoals()

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-3xl font-bold gradient-text mb-1"
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          Goals + Vision
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Foundation · Life goals by timeframe · Vision board
        </p>
      </div>
      <LifePlanClient initialSections={sections} initialGoals={goals} />
    </div>
  )
}
