// One-time migration: copy the Foundation + Rituals content from code into
// the life_plan_foundation table, byte-for-byte, then verify the readback
// matches the source exactly.
//
// Run: npx tsx scripts/seed-foundation.ts
import fs from 'node:fs'
import assert from 'node:assert'
import { createClient } from '@supabase/supabase-js'
import { FOUNDATION_DATA, RITUALS_DATA } from '../src/lib/life-plan-data'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

async function main() {
  const { error } = await supabase.from('life_plan_foundation').upsert([
    { key: 'foundation', data: FOUNDATION_DATA, updated_at: new Date().toISOString() },
    { key: 'rituals', data: RITUALS_DATA, updated_at: new Date().toISOString() },
  ], { onConflict: 'key' })
  if (error) throw new Error(error.message)

  // Verify: readback must deep-equal the source
  const { data: rows, error: re } = await supabase.from('life_plan_foundation').select('key, data')
  if (re) throw new Error(re.message)
  const byKey = Object.fromEntries((rows ?? []).map(r => [r.key, r.data]))
  assert.deepStrictEqual(byKey.foundation, JSON.parse(JSON.stringify(FOUNDATION_DATA)), 'foundation mismatch')
  assert.deepStrictEqual(byKey.rituals, JSON.parse(JSON.stringify(RITUALS_DATA)), 'rituals mismatch')

  console.log('✅ foundation + rituals migrated and verified byte-for-byte')
  console.log(`   core values: ${byKey.foundation.coreValues.length} · affirmations: ${byKey.rituals.affirmations.length} · gratitude: ${byKey.rituals.gratitude.length} · reminders: ${byKey.rituals.reminders.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
