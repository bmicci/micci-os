import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callGrok } from '../_shared/grok.ts'
import { writeBrief } from '../_shared/writeBrief.ts'
import { GLOBAL_SYSTEM, OUTPUT_INSTRUCTION, type BriefOutput } from '../_shared/output.ts'
import { chicagoDate } from '../_shared/chicago.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const secret = req.headers.get('x-dispatch-secret')
  if (secret !== Deno.env.get('DISPATCH_SECRET')) {
    return new Response('unauthorized', { status: 401 })
  }

  const started = Date.now()
  const today = chicagoDate()
  let status: 'success' | 'error' = 'success'
  let error_message: string | undefined
  let input_tokens = 0
  let output_tokens = 0
  let output: BriefOutput | null = null

  try {
    // Gather holdings
    const { data: positions } = await supabase
      .from('portfolio_positions')
      .select('ticker, shares, current_value, cost_basis, day_change, day_change_pct')
      .neq('ticker', 'CASH')

    const { data: history } = await supabase
      .from('portfolio_history')
      .select('snapshot_date, total_value')
      .order('snapshot_date', { ascending: false })
      .limit(2)

    const { data: prior } = await supabase
      .from('grok_briefs')
      .select('body_md, created_at')
      .eq('brief_key', 'markets')
      .order('brief_date', { ascending: false })
      .limit(5)

    const holdings = (positions || []).map(p => ({
      ticker: p.ticker,
      value: p.current_value,
      cost: p.cost_basis,
      day_change_pct: p.day_change_pct,
    }))

    const priorChange = history && history.length >= 2
      ? Number(history[0].total_value) - Number(history[1].total_value)
      : null

    const userContent = `
Holdings (current):
${JSON.stringify(holdings, null, 2)}

Prior-day portfolio value change: ${priorChange ?? 'unknown'}

Last 5 markets briefs (for consistency):
${(prior || []).map(b => b.body_md).join('\n---\n')}

${OUTPUT_INSTRUCTION}

Pre-market brief for Brandon's own portfolio. 1) Overnight and futures picture in 3 lines. 2) For each holding: material news, earnings or events in the next 5 trading days, and X sentiment shifts. Skip holdings with nothing new. 3) Decision table: ticker, hold / add / trim / sell, one-line reason tied to his thesis, confidence (low / med / high). Only change a prior call when something actually changed, and say what changed. 4) Watch list: up to 3 non-held names worth a look, each with a reason. This is decision support for his own review, not a trade instruction.
`

    const system = GLOBAL_SYSTEM(today)
    const result = await callGrok(system, userContent, ['web', 'x'])
    input_tokens = result.input_tokens
    output_tokens = result.output_tokens

    // Parse JSON
    let raw = result.text.trim()
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    try {
      const parsed = JSON.parse(raw) as BriefOutput
      output = {
        ...parsed,
        sources: [...(parsed.sources || []), ...result.sources].slice(0, 10),
      }
    } catch {
      output = {
        title: 'Markets parse error',
        highlights: ['Parse failed'],
        body_md: raw,
        sources: result.sources,
      }
      status = 'error'
      error_message = 'JSON parse failed'
    }
  } catch (e) {
    status = 'error'
    error_message = (e as Error).message
  }

  await writeBrief('markets', output, Deno.env.get('GROK_MODEL') || 'grok-4.7', {
    status,
    error_message,
    input_tokens,
    output_tokens,
    duration_ms: Date.now() - started,
  })

  return new Response(JSON.stringify({ status, error_message }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
