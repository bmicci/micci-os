import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { chicagoDate, chicagoTime, chicagoWeekday } from '../_shared/chicago.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const PROJECT_URL = Deno.env.get('SUPABASE_URL')!
const DISPATCH_SECRET = Deno.env.get('DISPATCH_SECRET')!

serve(async (req) => {
  const secret = req.headers.get('x-dispatch-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== DISPATCH_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  const url = new URL(req.url)
  const forceBrief = url.searchParams.get('brief')
  const force = url.searchParams.get('force') === 'true'

  const today = chicagoDate()
  const nowTime = chicagoTime()
  const weekday = chicagoWeekday()

  const { data: schedules } = await supabase
    .from('brief_schedules')
    .select('*')
    .eq('enabled', true)

  const toRun: string[] = []

  for (const s of schedules || []) {
    if (forceBrief && s.brief_key !== forceBrief) continue
    if (!force && (s.last_run_date === today || !s.days.includes(weekday) || nowTime < s.local_time)) continue

    // Mark as run first to prevent doubles
    await supabase.from('brief_schedules').update({ last_run_date: today }).eq('brief_key', s.brief_key)

    toRun.push(s.function_name)
  }

  // Invoke each (fire and forget; they log themselves)
  for (const fn of toRun) {
    const fnUrl = `${PROJECT_URL}/functions/v1/${fn}`
    fetch(fnUrl, {
      method: 'POST',
      headers: {
        'x-dispatch-secret': DISPATCH_SECRET,
        'Content-Type': 'application/json',
      },
      body: '{}',
    }).catch(err => console.error(`failed to invoke ${fn}`, err))
  }

  return new Response(JSON.stringify({ ran: toRun, today, nowTime, weekday }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
