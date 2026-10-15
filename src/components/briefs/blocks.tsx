'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, Scale } from 'lucide-react'
import type { BriefBlock, BriefDraft, Tone } from '@/lib/briefs'

export const TONE_COLOR: Record<Tone, string> = {
  good: '#34d399',
  warn: '#fbbf24',
  crit: '#f87171',
  accent: 'var(--accent-cyan)',
}

const toneColor = (t?: Tone) => (t ? TONE_COLOR[t] : undefined)

/** Card shell shared by every block — title row carries the feedback button. */
export function BlockCard({
  title, wide, action, children,
}: {
  title?: string
  wide?: boolean
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className={`relative glass-card p-4 sm:p-5 min-w-0 ${wide ? 'lg:col-span-2' : ''}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          {title ? (
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {title}
            </h3>
          ) : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

function Linkish({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <>{children}</>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="hover:text-[var(--accent-cyan)] transition-colors">
      {children}
    </a>
  )
}

export function Kpis({ items }: { items: Extract<BriefBlock, { type: 'kpis' }>['items'] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((k, i) => (
        <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="text-[11px] text-[var(--text-muted)] mb-0.5">{k.label}</div>
          <div className="text-[15px] font-semibold leading-snug" style={{ color: toneColor(k.tone) ?? 'var(--text-primary)' }}>
            {k.value}
          </div>
          {k.delta && <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{k.delta}</div>}
        </div>
      ))}
    </div>
  )
}

export function ListItems({ items }: { items: Extract<BriefBlock, { type: 'list' }>['items'] }) {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="pl-3" style={{ borderLeft: `2px solid ${toneColor(it.tone) ?? 'rgba(0,212,255,0.25)'}` }}>
          <div className="text-[14px] font-medium text-[var(--text-primary)] leading-snug">
            <Linkish href={it.link}>{it.title}</Linkish>
          </div>
          {it.detail && (
            <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed whitespace-pre-line">{it.detail}</p>
          )}
          {it.link && it.link_label && (
            <a href={it.link} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-[12px] text-[var(--accent-cyan)] mt-1">
              {it.link_label} <ExternalLink size={11} />
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

export function Table({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[640px] text-[13px] border-collapse">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c} className="text-left font-medium text-[var(--text-muted)] px-2 py-1.5 whitespace-nowrap"
                  style={{ borderBottom: '1px solid rgba(0,212,255,0.15)' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {r.map((cell, j) => (
                <td key={j} className={`px-2 py-2 align-top text-[var(--text-secondary)] ${j === 0 ? 'font-medium text-[var(--text-primary)] whitespace-nowrap' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Decision({ question, recommendation, context }: { question: string; recommendation: string; context?: string }) {
  return (
    <div>
      <div className="flex gap-2 items-start">
        <Scale size={16} className="text-[var(--accent-cyan)] shrink-0 mt-0.5" />
        <p className="text-[14px] font-medium text-[var(--text-primary)] leading-snug">{question}</p>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed whitespace-pre-line">{recommendation}</p>
      {context && <p className="text-[12px] text-[var(--text-muted)] mt-2 whitespace-pre-line">{context}</p>}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }).catch(() => {})
      }}
      className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md transition-colors"
      style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--accent-cyan)' }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function Drafts({ items }: { items: BriefDraft[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      {items.map((d, i) => (
        <div key={i} className="rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <button onClick={() => setOpen(open === i ? null : i)} className="w-full text-left px-3 py-2.5">
            <div className="text-[13px] font-medium text-[var(--text-primary)]">{d.action}</div>
            <div className="text-[12px] text-[var(--text-muted)] mt-0.5 truncate">
              {d.to || d.to_note || 'No recipient'}{d.when ? ` · ${d.when}` : ''}
            </div>
          </button>
          {open === i && (
            <div className="px-3 pb-3">
              <div className="text-[12px] text-[var(--text-secondary)] mb-2"><span className="text-[var(--text-muted)]">Subject:</span> {d.subject}</div>
              {d.cc && <div className="text-[12px] text-[var(--text-secondary)] mb-2"><span className="text-[var(--text-muted)]">Cc:</span> {d.cc}</div>}
              {!d.to && d.to_note && <div className="text-[12px] mb-2" style={{ color: TONE_COLOR.warn }}>{d.to_note}</div>}
              <pre className="text-[13px] text-[var(--text-primary)] whitespace-pre-wrap font-sans leading-relaxed rounded-md p-3"
                   style={{ background: 'rgba(0,0,0,0.25)' }}>
                {d.draft}
              </pre>
              <div className="flex gap-2 mt-2">
                <CopyButton text={d.draft} />
                {d.thread_link && (
                  <a href={d.thread_link} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md"
                     style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    Open in Gmail <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/** Renders one generic block body (title + card handled by the caller). */
export function BlockBody({ block }: { block: BriefBlock }) {
  switch (block.type) {
    case 'kpis':     return <Kpis items={block.items ?? []} />
    case 'list':     return <ListItems items={block.items ?? []} />
    case 'table':    return <Table columns={block.columns ?? []} rows={block.rows ?? []} />
    case 'drafts':   return <Drafts items={block.items ?? []} />
    case 'decision': return <Decision question={block.question} recommendation={block.recommendation} context={block.context} />
    case 'text':     return <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{block.body}</p>
    default:         return <pre className="text-[12px] text-[var(--text-muted)] whitespace-pre-wrap">{JSON.stringify(block, null, 2)}</pre>
  }
}
