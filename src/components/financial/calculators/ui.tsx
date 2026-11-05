'use client'

// Shared building blocks for the Calculators section (Aurora glass, 44px touch targets).
import { useId } from 'react'

export const usd = (n: number, cents = false) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })

export function Card({ title, subtitle, children, className = '' }: { title?: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-card p-4 md:p-5 flex flex-col gap-4 ${className}`} style={{ borderRadius: 20 }}>
      {title && (
        <header>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          {subtitle && <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'good' | 'bad' | 'accent' }) {
  const color = tone === 'good' ? '#4ade80' : tone === 'bad' ? '#f87171' : tone === 'accent' ? 'var(--accent-cyan)' : 'var(--text-primary)'
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-2xl min-w-0" style={{ background: 'rgba(7,11,26,0.45)' }}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xl font-bold tabular-nums leading-tight break-words" style={{ color }}>{value}</span>
      {hint && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  )
}

export function NumberField({ label, value, onChange, prefix, suffix, step = 1, min = 0, max, hint }: {
  label: string; value: number; onChange: (n: number) => void; prefix?: string; suffix?: string
  step?: number; min?: number; max?: number; hint?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="flex items-center h-11 rounded-xl px-3 gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-line)' }}>
        {prefix && <span style={{ color: 'var(--text-muted)' }}>{prefix}</span>}
        <input id={id} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''} step={step} min={min} max={max}
          onChange={e => { const n = parseFloat(e.target.value); onChange(Number.isFinite(n) ? n : 0) }}
          className="flex-1 min-w-0 bg-transparent outline-none text-base tabular-nums" style={{ color: 'var(--text-primary)' }} />
        {suffix && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{suffix}</span>}
      </div>
      {hint && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  )
}

export function RangeField({ label, value, onChange, min, max, step = 1, format }: {
  label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; format?: (n: number) => string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--accent-cyan)' }}>{format ? format(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-11" style={{ accentColor: '#5ee6ff' }} />
    </div>
  )
}

export function Segmented<T extends string | number>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string
}) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar flex gap-1 p-1 rounded-2xl overflow-x-auto"
      style={{ background: 'rgba(7,11,26,0.5)' }}>
      {options.map(o => (
        <button key={String(o.value)} onClick={() => onChange(o.value)} aria-pressed={o.value === value}
          className="flex-1 flex-none h-10 px-3.5 rounded-xl text-[13px] whitespace-nowrap transition-colors"
          style={{ background: o.value === value ? 'rgba(255,255,255,0.14)' : 'transparent',
            color: o.value === value ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: o.value === value ? 600 : 500 }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className="flex-none w-11 h-11 flex items-center justify-center">
      <span className="w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center text-[13px] font-black transition-colors"
        style={{ borderColor: checked ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.32)', background: checked ? 'var(--accent-cyan)' : 'transparent', color: '#04131c' }}>
        {checked ? '✓' : ''}
      </span>
    </button>
  )
}
