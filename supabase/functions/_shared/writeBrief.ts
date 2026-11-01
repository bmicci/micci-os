import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { BriefOutput } from './output.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

export async function writeBrief(
  briefKey: string,
  output: BriefOutput | null,
  model: string,
  runMeta: {
    status: 'success' | 'error' | 'skipped'
    error_message?: string
    input_tokens?: number
    output_tokens?: number
    duration_ms?: number
  }
) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const started = new Date()

  if (output && runMeta.status === 'success') {
    await supabase.from('grok_briefs').upsert({
      brief_key: briefKey,
      brief_date: today,
      title: output.title,
      body_md: output.body_md,
      highlights: output.highlights,
      sources: output.sources,
      model,
    }, { onConflict: 'brief_key,brief_date' })
  }

  await supabase.from('brief_runs').insert({
    brief_key: briefKey,
    started_at: started.toISOString(),
    finished_at: new Date().toISOString(),
    status: runMeta.status,
    error_message: runMeta.error_message,
    input_tokens: runMeta.input_tokens,
    output_tokens: runMeta.output_tokens,
    duration_ms: runMeta.duration_ms,
  })
}
