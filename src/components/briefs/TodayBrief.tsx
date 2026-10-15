'use client'

import type { BriefBlock, TodayPayload } from '@/lib/briefs'
import { BlockCard, Decision, Drafts, Kpis, TONE_COLOR } from './blocks'

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  waiting_on_me:   { label: 'Waiting on you', color: TONE_COLOR.crit },
  scheduled:       { label: 'Scheduled',      color: TONE_COLOR.good },
  waiting_on_them: { label: 'Waiting on them', color: 'var(--text-secondary)' },
  cold:            { label: 'Cold',           color: 'var(--text-muted)' },
}

/**
 * Morning Brief layout. The Routine writes a richer document than the generic
 * block list (priorities, calendar strip, pipeline rows, prep), so it gets its
 * own renderer. `feedback(section)` renders the tweak button for a card.
 */
export default function TodayBrief({
  payload, feedback,
}: {
  payload: TodayPayload
  feedback: (section: string) => React.ReactNode
}) {
  const s = payload.sections ?? {}
  const counts: Extract<BriefBlock, { type: 'kpis' }>['items'] = [
    { label: 'Day', value: payload.day_type ?? '—', tone: payload.day_type === 'heavy' ? 'warn' : 'accent' },
    { label: 'Interviews (48h)', value: String(s.counts?.interviews_48h ?? 0) },
    { label: 'Waiting on you', value: String(s.counts?.waiting_on_me ?? 0), tone: (s.counts?.waiting_on_me ?? 0) > 0 ? 'crit' : undefined },
    { label: 'Noise filtered', value: String(s.counts?.noise_filtered ?? 0) },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <BlockCard title="At a glance" action={feedback('At a glance')} wide>
        <Kpis items={counts} />
      </BlockCard>

      {!!payload.priorities?.length && (
        <BlockCard title="Priorities" action={feedback('Priorities')}>
          <ol className="space-y-3">
            {[...payload.priorities].sort((a, b) => a.rank - b.rank).map(p => (
              <li key={p.rank} className="flex gap-3">
                <span className="text-[13px] font-bold shrink-0 w-5 text-[var(--accent-cyan)]">{p.rank}</span>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-[var(--text-primary)] leading-snug">
                    {p.link
                      ? <a href={p.link} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-cyan)]">{p.title}</a>
                      : p.title}
                  </div>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">{p.why}</p>
                </div>
              </li>
            ))}
          </ol>
        </BlockCard>
      )}

      {!!s.today?.length && (
        <BlockCard title="Today's calendar" action={feedback("Today's calendar")}>
          <ul className="space-y-1.5">
            {s.today.map((e, i) => (
              <li key={i} className="flex gap-3 text-[13px]">
                <span className="tabular-nums text-[var(--text-muted)] shrink-0 w-[92px]">{e.start}–{e.end}</span>
                <span style={{ color: e.key ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: e.key ? 600 : 400 }}>
                  {e.title}
                </span>
              </li>
            ))}
          </ul>
        </BlockCard>
      )}

      {payload.decision && (
        <BlockCard title="One decision" action={feedback('One decision')}>
          <Decision {...payload.decision} />
        </BlockCard>
      )}

      {!!payload.emails?.length && (
        <BlockCard title="Ready-to-send drafts" action={feedback('Drafts')}>
          <Drafts items={payload.emails} />
        </BlockCard>
      )}

      {!!s.pipeline?.length && (
        <BlockCard title="Pipeline" action={feedback('Pipeline')} wide>
          <ul className="divide-y divide-white/5">
            {s.pipeline.map((p, i) => {
              const st = STATUS_STYLE[p.status] ?? { label: p.status, color: 'var(--text-secondary)' }
              return (
                <li key={i} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[14px] font-medium text-[var(--text-primary)]">{p.company}</span>
                    <span className="text-[12px] text-[var(--text-muted)]">{p.role}</span>
                    <span className="text-[11px] font-semibold ml-auto" style={{ color: st.color }}>{st.label}</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1">{p.stage}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--accent-cyan)' }}>Next: {p.next}</p>
                </li>
              )
            })}
          </ul>
        </BlockCard>
      )}

      {!!s.interview_prep?.length && (
        <BlockCard title="Interview prep" action={feedback('Interview prep')} wide>
          <div className="space-y-4">
            {s.interview_prep.map((ip, i) => (
              <div key={i}>
                <div className="text-[14px] font-medium text-[var(--text-primary)]">
                  {ip.link
                    ? <a href={ip.link} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-cyan)]">{ip.company} · {ip.role}</a>
                    : `${ip.company} · ${ip.role}`}
                </div>
                <div className="text-[12px] text-[var(--text-muted)] mt-0.5">{ip.when} · with {ip.with}</div>
                <ul className="mt-2 space-y-1.5 list-disc pl-5">
                  {ip.notes.map((n, j) => <li key={j} className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{n}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </BlockCard>
      )}
    </div>
  )
}
