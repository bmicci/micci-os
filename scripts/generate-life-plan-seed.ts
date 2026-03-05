/**
 * scripts/generate-life-plan-seed.ts
 * Run: npx tsx scripts/generate-life-plan-seed.ts > supabase/seed_life_plan.sql
 *
 * Reads SECTIONS from life-plan-data.ts and generates SQL INSERT statements
 * for life_plan_sections and life_plan_goals tables.
 */

import { SECTIONS } from '../src/lib/life-plan-data'

// Escape single quotes for SQL
function sql(s: string | null): string {
  if (s === null) return 'NULL'
  return `'${s.replace(/'/g, "''")}'`
}

const lines: string[] = []

lines.push(`-- =============================================================`)
lines.push(`-- Life Plan Seed Data — Auto-generated from life-plan-data.ts`)
lines.push(`-- DO NOT EDIT MANUALLY — re-run scripts/generate-life-plan-seed.ts`)
lines.push(`-- =============================================================`)
lines.push(``)
lines.push(`-- Sections`)
lines.push(`INSERT INTO life_plan_sections (id, name, color_hex, sort_order) VALUES`)

const sectionRows = SECTIONS.filter(s => !s.isVision).map((s, i) =>
  `  (${sql(s.id)}, ${sql(s.name)}, ${sql(s.colorHex)}, ${i + 1})`
)
lines.push(sectionRows.join(',\n') + `;`)
lines.push(``)
lines.push(`-- Goals`)
lines.push(`INSERT INTO life_plan_goals (section_id, timeframe, timeframe_label, category_header, goal_text, sort_order) VALUES`)

const goalRows: string[] = []
let order = 1

for (const section of SECTIONS) {
  if (section.isVision) continue

  // Timeframe-based goals
  if (section.timeframes) {
    for (const [tf, tfData] of Object.entries(section.timeframes)) {
      for (const cat of tfData.categories) {
        for (const goal of cat.goals) {
          goalRows.push(`  (${sql(section.id)}, ${sql(tf)}, ${sql(tfData.label)}, ${sql(cat.header)}, ${sql(goal)}, ${order++})`)
        }
      }
    }
  }

  // Pinned goals (fun section)
  if (section.pinned) {
    for (const p of section.pinned) {
      for (const goal of p.goals) {
        goalRows.push(`  (${sql(section.id)}, 'pinned', ${sql(p.label)}, NULL, ${sql(goal)}, ${order++})`)
      }
    }
  }

  // All-ages goals (fun section)
  if (section.allAges) {
    for (const aa of section.allAges) {
      if (aa.goals) {
        for (const goal of aa.goals) {
          goalRows.push(`  (${sql(section.id)}, 'all', ${sql(aa.label)}, NULL, ${sql(goal)}, ${order++})`)
        }
      }
      if (aa.subcategories) {
        for (const sub of aa.subcategories) {
          for (const goal of sub.goals) {
            goalRows.push(`  (${sql(section.id)}, 'all', ${sql(aa.label)}, ${sql(sub.header)}, ${sql(goal)}, ${order++})`)
          }
        }
      }
    }
  }
}

lines.push(goalRows.join(',\n') + `;`)
lines.push(``)
lines.push(`-- Total: ${order - 1} goals seeded`)

console.log(lines.join('\n'))
