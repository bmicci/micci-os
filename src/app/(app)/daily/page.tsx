import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Daily — Micci OS' }

export default async function DailyPage() {
  const service = createServiceClient()
  let brief: any = null
  let runs: any[] = []

  if (service) {
    const { data } = await service
      .from('grok_briefs')
      .select('*')
      .eq('brief_key', 'markets')
      .order('brief_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    brief = data

    const { data: runData } = await service
      .from('brief_runs')
      .select('*')
      .eq('brief_key', 'markets')
      .order('started_at', { ascending: false })
      .limit(14)
    runs = runData || []
  }

  return (
    <div className="flex flex-col h-full px-6 md:px-10 pt-8 pb-4">
      <h1 className="text-3xl font-bold gradient-text mb-1">Daily</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-6">Grok markets brief (phase 1 pilot)</p>

      {brief ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">{brief.title}</h2>
            <p className="text-xs text-[var(--text-secondary)]">{brief.brief_date} · {brief.model}</p>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {(brief.highlights || []).map((h: string, i: number) => <li key={i}>{h}</li>)}
          </ul>
          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
            {brief.body_md || ''}
          </div>
          {brief.sources?.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Sources</h3>
              <ul className="text-sm space-y-1">
                {brief.sources.map((s: any, i: number) => (
                  <li key={i}><a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.title}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p>No markets brief yet. Run the dispatcher manually or wait for schedule.</p>
      )}

      <div className="mt-10">
        <h3 className="font-medium mb-2">Recent runs</h3>
        <ul className="text-xs space-y-1">
          {runs.map(r => (
            <li key={r.id}>{r.started_at?.slice(0,16)} — {r.status} ({r.duration_ms}ms, {r.input_tokens}/{r.output_tokens})</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
