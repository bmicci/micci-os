import Link from 'next/link'
import { Building2 } from 'lucide-react'
import type { RoleSummary } from '@/lib/finance/roleSummary'

// The job Brandon holds now (accepted offer in financial_settings.job_offers),
// in the dashboard slot the job-search pipeline used to fill.

function fmtRound(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function fmtDay(iso: string, withWeekday = false): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    ...(withWeekday ? { weekday: 'short' as const } : {}), month: 'short', day: 'numeric',
  })
}

function inDays(n: number): string {
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  return `in ${n} days`
}

export default function RoleCard({ role }: { role: RoleSummary }) {
  const cells: { value: string; label: string; tone?: string }[] = [
    {
      value: fmtDay(role.startDate),
      label: role.started
        ? `Started · day ${role.dayInRole}, week ${role.weekInRole}`
        : `Starts ${inDays(-role.dayInRole)}`,
    },
    role.nextPayday
      ? {
          value: fmtDay(role.nextPayday, true),
          label: `${role.firstCheck ? 'First check' : 'Next payday'} · ${inDays(role.daysToPayday ?? 0)}`,
          tone: '#22c55e',
        }
      : { value: '—', label: 'Next payday' },
    { value: fmtRound(role.netPerCheck), label: 'Net per check (est.)' },
    { value: role.payLabel, label: `Pay · ${fmtRound(role.annualGross)} base` },
  ]
  if (role.k401Annual > 0) {
    cells.push({
      value: fmtRound(role.k401Annual) + '/yr',
      label: `401(k)${role.k401Pct != null ? ` · ${role.k401Pct}% pre-tax` : ''}`,
    })
  }

  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-baseline gap-3 flex-wrap mb-3">
        <h3 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Building2 size={14} strokeWidth={2} className="text-[var(--accent-cyan)]" />
          {role.employer}
          {role.title && <span className="font-normal text-[var(--text-secondary)]">· {role.title}</span>}
        </h3>
        <Link href="/finance/paycheck" className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)]">
          Paycheck →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-3">
        {cells.map(c => (
          <div key={c.label}>
            <div className="font-mono text-[15px] font-bold" style={{ color: c.tone ?? 'var(--text-primary)' }}>{c.value}</div>
            <div className="text-[9.5px] uppercase tracking-widest text-[var(--text-muted)]">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
