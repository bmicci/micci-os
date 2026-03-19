import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Brandon's default routine seed data
const SEED_ROUTINES = [
  // ── Morning ──────────────────────────────────────────────────────
  { title: 'Morning Prayer', category: 'spiritual', time_of_day: 'morning', frequency: 'daily', sort_order: 1 },
  { title: 'Meditation (10 min)', category: 'personal', time_of_day: 'morning', frequency: 'daily', sort_order: 2 },
  { title: 'Journal (5 min)', category: 'personal', time_of_day: 'morning', frequency: 'daily', sort_order: 3, description: 'Morning pages or gratitude entry' },
  { title: 'Cold Shower', category: 'personal', time_of_day: 'morning', frequency: 'daily', sort_order: 4 },
  { title: 'AM Skincare Routine', category: 'skincare', time_of_day: 'morning', frequency: 'daily', sort_order: 5, description: '6 steps: Cleanser → Toner → Vit C → Snail → Moisturizer → SPF 50+' },
  { title: 'AM Supplements', category: 'supplement', time_of_day: 'morning', frequency: 'daily', sort_order: 6, description: 'Vitamin D, Fish Oil, Magnesium Glycinate, NMN + others' },
  { title: 'Review Daily Goals', category: 'personal', time_of_day: 'morning', frequency: 'daily', sort_order: 7 },

  // ── Midday ───────────────────────────────────────────────────────
  { title: 'Workout (ClassPass)', category: 'fitness', time_of_day: 'midday', frequency: 'weekdays', sort_order: 1, description: 'Gym, yoga, reformer, or strength class' },
  { title: '30-Minute Walk', category: 'fitness', time_of_day: 'midday', frequency: 'daily', sort_order: 2 },
  { title: 'HCG 250 IU SubQ', category: 'health_protocol', time_of_day: 'midday', frequency: 'custom', days_of_week: ['monday', 'thursday'], sort_order: 3, description: 'SubQ injection — alternate sides' },
  { title: 'Anastrozole 0.5mg', category: 'health_protocol', time_of_day: 'midday', frequency: 'custom', days_of_week: ['wednesday'], sort_order: 4, description: 'With food — Wed with TRT' },
  { title: 'Network Outreach (1 contact)', category: 'work', time_of_day: 'midday', frequency: 'weekdays', sort_order: 5, description: 'LinkedIn message, email, or call — job search pipeline' },

  // ── Evening ──────────────────────────────────────────────────────
  { title: 'PM Skincare — Tret Night', category: 'skincare', time_of_day: 'evening', frequency: 'custom', days_of_week: ['monday', 'wednesday', 'friday'], sort_order: 1, description: '7 steps: Double cleanse → HA Toner → Tretinoin → Cera-Nol → Eye Cream → BOH Cream' },
  { title: 'PM Skincare — Off Night', category: 'skincare', time_of_day: 'evening', frequency: 'custom', days_of_week: ['tuesday', 'thursday', 'saturday', 'sunday'], sort_order: 2, description: '8 steps: Double cleanse → Pore Pads → HA Toner → Anua TXA → Snail → Eye → Sleeping Mask' },
  { title: 'Testosterone Cypionate 200mg IM', category: 'health_protocol', time_of_day: 'evening', frequency: 'custom', days_of_week: ['wednesday'], sort_order: 3, description: 'IM injection — glute or quad, alternate sides' },
  { title: 'Evening Supplements', category: 'supplement', time_of_day: 'evening', frequency: 'daily', sort_order: 4, description: 'Zinc, B-Complex, additional Magnesium if needed' },
  { title: 'Review Tomorrow\'s Schedule', category: 'personal', time_of_day: 'evening', frequency: 'daily', sort_order: 5 },
  { title: 'Gratitude — 3 Things', category: 'personal', time_of_day: 'evening', frequency: 'daily', sort_order: 6 },
  { title: 'Evening Prayer', category: 'spiritual', time_of_day: 'evening', frequency: 'daily', sort_order: 7 },
  { title: 'Rosary', category: 'spiritual', time_of_day: 'evening', frequency: 'daily', sort_order: 8 },
  { title: 'Phone Off by 10pm', category: 'personal', time_of_day: 'evening', frequency: 'daily', sort_order: 9 },
  { title: 'In Bed by 10:30pm', category: 'personal', time_of_day: 'evening', frequency: 'daily', sort_order: 10 },
  { title: 'Log Daily Wins', category: 'personal', time_of_day: 'evening', frequency: 'daily', sort_order: 11 },

  // ── Anytime / Weekly ─────────────────────────────────────────────
  { title: 'IR Sauna Session (30 min)', category: 'fitness', time_of_day: 'anytime', frequency: 'custom', days_of_week: ['tuesday', 'saturday'], sort_order: 1 },
  { title: 'Lip Sleeping Mask (LANEIGE)', category: 'skincare', time_of_day: 'anytime', frequency: 'daily', sort_order: 2, description: 'Apply at night before sleep' },
]

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only seed if user has no routines yet
  const { count } = await supabase
    .from('routines')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ message: 'Already seeded', count })
  }

  const rows = SEED_ROUTINES.map(r => ({ ...r, user_id: user.id, source_type: 'manual' }))
  const { data, error } = await supabase.from('routines').insert(rows).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ seeded: data?.length ?? 0 })
}
