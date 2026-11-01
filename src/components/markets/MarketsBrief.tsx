import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import {
  BRIEF_TYPE_LABEL, BRIEF_TYPE_SCHEDULE, MARKETS_BRIEF_TYPES, parseMarkdown, tokenizeInline,
  type ActionBias, type MarketsBriefStatus, type MarketsBriefType, type MarketsBriefView,
  type SnapshotView,
} from '@/lib/marketsBriefs'

// Server-rendered pieces for /markets. Tone colors match the briefs hub
// (src/components/briefs/blocks.tsx) so both pages read as one system.
const GOOD = '#34d399'
const WARN = '#fbbf24'
const CRIT = '#f87171'

const BIAS_STYLE: Record<ActionBias, { color: string; label: string }> = {
  hold:  { color: 'var(--accent-cyan)', label: 'Hold' },
  watch: { color: WARN, label: 'Watch' },
  trim:  { color: CRIT, label: 'Trim' },
  add:   { color: GOOD, label: 'Add' },
}

const STATUS_STYLE: Record<MarketsBriefStatus, { color: string; label: string }> = {
  ok:      { color: GOOD, label: 'OK' },
  partial: { color: WARN, label: 'Partial' },
  failed:  { color: CRIT, label: 'Failed' },
}

// ── formatting ─────────────────────────────────────────────────────────────

const usd = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: digits })

const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`

const signColor = (n: number | null) =>
  n === null ? undefined : n > 0 ? GOOD : n < 0 ? CRIT : undefined

function fmtAsOf(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', {
    timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) + ' CT'
}

export function fmtBriefDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
}

const humanKey = (k: string) => k.replace(/_/g, ' ').replace(/\bpct\b/g, '%')

// ── small pieces ───────────────────────────────────────────────────────────

function Chip({ color, children, title }: { color: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ color, border: `1px solid ${color}`, background: 'rgba(0,0,0,0.25)' }}
    >
      {children}
    </span>
  )
}

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-card p-4 sm:p-5 min-w-0 ${className}`}>
      {title && (
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">{title}</h3>
      )}
      {children}
    </section>
  )
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {tokenizeInline(text).map((t, i) => {
        switch (t.kind) {
          case 'bold': return <strong key={i} className="font-semibold text-[var(--text-primary)]">{t.text}</strong>
          case 'code': return <code key={i} className="font-mono text-[12px] px-1 rounded bg-black/30">{t.text}</code>
          case 'link': return (
            <a key={i} href={t.url} target="_blank" rel="noreferrer noopener" className="underline decoration-dotted hover:text-[var(--accent-cyan)]">{t.text}</a>
          )
          default: return <span key={i}>{t.text}</span>
        }
      })}
    </>
  )
}

function Markdown({ md }: { md: string }) {
  const blocks = parseMarkdown(md)
  if (!blocks.length) return <p className="text-[13px] text-[var(--text-muted)]">No body.</p>
  return (
    <div className="space-y-3 text-[14px] leading-relaxed text-[var(--text-secondary)]">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return <h4 key={i} className="text-[14px] font-semibold text-[var(--text-primary)] pt-1"><Inline text={b.text} /></h4>
        }
        if (b.kind === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul'
          return (
            <Tag key={i} className={`${b.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
              {b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}
            </Tag>
          )
        }
        return <p key={i}><Inline text={b.text} /></p>
      })}
    </div>
  )
}

function Kpi({ label, value, color, note }: { label: string; value: string; color?: string; note?: string }) {
  return (
    <div className="min-w-0">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value truncate" style={color ? { color } : undefined}>{value}</div>
      {note && <div className="kpi-note">{note}</div>}
    </div>
  )
}

// ── snapshot ───────────────────────────────────────────────────────────────

// Concentration limits from the standing CUT rule (QQQ > 27%, QQQ+SMH > 48%).
const QQQ_LIMIT = 27
const QQQ_SMH_LIMIT = 48

function SnapshotCard({ s, dayLabel }: { s: SnapshotView; dayLabel: string }) {
  const kpis: React.ReactNode[] = []
  if (s.accountEst !== null) kpis.push(<Kpi key="est" label="Account est." value={usd(s.accountEst)} note={s.cash !== null ? `${usd(s.cash)} cash` : undefined} />)
  if (s.dayPct !== null) kpis.push(<Kpi key="day" label={dayLabel} value={pct(s.dayPct)} color={signColor(s.dayPct)} />)
  if (s.uplPct !== null) kpis.push(<Kpi key="upl" label="vs cost (UPL)" value={pct(s.uplPct)} color={signColor(s.uplPct)} />)
  if (s.qqqWeightPct !== null) kpis.push(
    <Kpi key="qqq" label="QQQ weight" value={`${s.qqqWeightPct.toFixed(1)}%`}
      color={s.qqqWeightPct > QQQ_LIMIT ? CRIT : undefined} note={`limit ${QQQ_LIMIT}%`} />,
  )
  if (s.qqqSmhWeightPct !== null) kpis.push(
    <Kpi key="qs" label="QQQ + SMH" value={`${s.qqqSmhWeightPct.toFixed(1)}%`}
      color={s.qqqSmhWeightPct > QQQ_SMH_LIMIT ? CRIT : undefined} note={`limit ${QQQ_SMH_LIMIT}%`} />,
  )

  const hasPriceDetail = s.prices.some(p => p.dayPct !== null || p.vsCostPct !== null)

  return (
    <Card title="Portfolio snapshot">
      {s.asOfLabel && <p className="text-[12px] text-[var(--text-muted)] -mt-2 mb-3">Prices as of {s.asOfLabel}</p>}
      {kpis.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">{kpis}</div>}

      {s.prices.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="text-left kpi-label">
                <th className="px-1 py-1.5 font-bold">Ticker</th>
                <th className="px-1 py-1.5 font-bold text-right">Price</th>
                {hasPriceDetail && <th className="px-1 py-1.5 font-bold text-right">Day</th>}
                {hasPriceDetail && <th className="px-1 py-1.5 font-bold text-right">vs cost</th>}
              </tr>
            </thead>
            <tbody>
              {s.prices.map(p => (
                <tr key={p.ticker} className="row-hover border-t border-white/5">
                  <td className="px-1 py-1.5 font-semibold text-[var(--text-primary)]">{p.ticker}</td>
                  <td className="px-1 py-1.5 text-right">{p.px !== null ? usd(p.px, 2) : '—'}</td>
                  {hasPriceDetail && (
                    <td className="px-1 py-1.5 text-right" style={{ color: signColor(p.dayPct) }}>{p.dayPct !== null ? pct(p.dayPct) : '—'}</td>
                  )}
                  {hasPriceDetail && (
                    <td className="px-1 py-1.5 text-right" style={{ color: signColor(p.vsCostPct) }}>{p.vsCostPct !== null ? pct(p.vsCostPct) : '—'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(s.futures.length > 0 || s.flags.length > 0 || s.movers.length > 0) && (
        <div className="mt-4 space-y-2 text-[12px]">
          {s.futures.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="kpi-label self-center">Futures · rates</span>
              {s.futures.map(f => (
                <span key={f.symbol} className="tabular-nums text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">{f.symbol}</span> {f.value.toLocaleString('en-US')}
                </span>
              ))}
            </div>
          )}
          {s.flags.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="kpi-label self-center">Lines</span>
              {s.flags.map(f => (
                <span key={f.key} className="tabular-nums text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">{humanKey(f.key)}</span> {f.value}
                </span>
              ))}
            </div>
          )}
          {s.movers.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="kpi-label self-center">Movers</span>
              {s.movers.map((m, i) => <span key={i} className="text-[var(--text-secondary)]">{m}</span>)}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ── the brief ──────────────────────────────────────────────────────────────

export function MarketsBriefDetail({ brief }: { brief: MarketsBriefView }) {
  const status = STATUS_STYLE[brief.status]
  const bias = brief.bias ? BIAS_STYLE[brief.bias] : null
  const asOf = fmtAsOf(brief.asOf)
  const dayLabel = brief.type === 'pre_market' ? 'Prior session' : 'Day'

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {bias
            ? <Chip color={bias.color} title="Action bias for this brief">Bias · {bias.label}</Chip>
            : <Chip color="var(--text-muted)" title="The bot didn't set an action bias">No bias set</Chip>}
          <Chip color={status.color} title="Run status">{status.label}</Chip>
          {brief.isTest && <Chip color={WARN}>Test row</Chip>}
        </div>
        <h2 className="text-[19px] sm:text-[21px] font-semibold leading-snug text-[var(--text-primary)]">{brief.title}</h2>
        <p className="text-[12px] text-[var(--text-muted)] mt-1">
          {BRIEF_TYPE_LABEL[brief.type]} · {fmtBriefDate(brief.date)}
          {asOf ? ` · prices as of ${asOf}` : ' · as-of time not reported'}
          {brief.accountMask ? ` · account ••${brief.accountMask}` : ''}
        </p>
      </div>

      {brief.status !== 'ok' && (
        <div className="glass-card p-3 text-[13px]" style={{ borderColor: status.color, color: status.color }}>
          {brief.status === 'partial'
            ? 'This run finished with partial data. Some numbers may be missing or stale.'
            : 'This run failed. The content below may be incomplete.'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4 min-w-0">
          {brief.highlights.length > 0 && (
            <Card title="Highlights">
              <ul className="space-y-1.5 text-[14px] text-[var(--text-secondary)]">
                {brief.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[9px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent-cyan)' }} />
                    <span><Inline text={h} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="Brief">
            <Markdown md={brief.body} />
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4 min-w-0">
          {brief.snapshot
            ? <SnapshotCard s={brief.snapshot} dayLabel={dayLabel} />
            : <Card title="Portfolio snapshot"><p className="text-[13px] text-[var(--text-muted)]">No snapshot in this brief.</p></Card>}
          {brief.sources.length > 0 && (
            <Card title="Sources">
              <ul className="space-y-1.5 text-[13px]">
                {brief.sources.map((s, i) => (
                  <li key={i}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]">
                        <ExternalLink size={12} className="shrink-0" /> {s.label}
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">{s.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ── type toggle + history ──────────────────────────────────────────────────

export function TypeToggle({
  date, active, available, href,
}: {
  date: string
  active: MarketsBriefType
  available: Set<MarketsBriefType>
  href: (date: string, type?: MarketsBriefType) => string
}) {
  return (
    <div className="inline-flex rounded-lg p-0.5 bg-black/30" role="tablist" aria-label="Brief type">
      {MARKETS_BRIEF_TYPES.map(t => {
        const on = t === active
        const has = available.has(t)
        return (
          <Link
            key={t}
            href={href(date, t)}
            role="tab"
            aria-selected={on}
            aria-disabled={!has}
            title={has ? BRIEF_TYPE_SCHEDULE[t] : `No ${BRIEF_TYPE_LABEL[t].toLowerCase()} brief for this date (${BRIEF_TYPE_SCHEDULE[t]})`}
            className={`text-[12px] sm:text-[13px] font-medium px-3 py-1.5 rounded-md transition-colors ${has ? '' : 'opacity-40'}`}
            style={on
              ? { background: 'var(--accent-gradient)', color: 'var(--accent-ink, #050505)' }
              : { color: 'var(--text-secondary)' }}
          >
            {BRIEF_TYPE_LABEL[t]}
          </Link>
        )
      })}
    </div>
  )
}

export interface HistoryDay {
  date: string
  types: { type: MarketsBriefType; title: string; bias: ActionBias | null; status: MarketsBriefStatus; isTest: boolean }[]
}

export function HistoryList({
  days, activeDate, href,
}: {
  days: HistoryDay[]
  activeDate: string | null
  href: (date: string, type?: MarketsBriefType) => string
}) {
  if (!days.length) return null
  return (
    <Card title="History">
      <ul className="divide-y divide-white/5">
        {days.map(day => (
          <li key={day.date} className={`py-2 first:pt-0 last:pb-0 ${day.date === activeDate ? 'opacity-100' : 'opacity-80'}`}>
            <div className="flex items-baseline gap-3">
              <span className={`text-[12px] w-24 shrink-0 tabular-nums ${day.date === activeDate ? 'text-[var(--accent-cyan)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                {fmtBriefDate(day.date)}
              </span>
              <div className="flex flex-col gap-1 min-w-0">
                {day.types.map(t => {
                  const bias = t.bias ? BIAS_STYLE[t.bias] : null
                  return (
                    <Link key={t.type} href={href(day.date, t.type)}
                      className="flex items-center gap-2 min-w-0 text-[13px] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]">
                      <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] w-16 shrink-0">
                        {t.type === 'pre_market' ? 'Pre' : 'Close'}
                      </span>
                      <span className="truncate">{t.title}</span>
                      {bias && <span className="text-[11px] font-semibold shrink-0" style={{ color: bias.color }}>{bias.label}</span>}
                      {t.status !== 'ok' && <span className="text-[11px] shrink-0" style={{ color: STATUS_STYLE[t.status].color }}>{STATUS_STYLE[t.status].label}</span>}
                      {t.isTest && <span className="text-[11px] shrink-0" style={{ color: WARN }}>test</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
