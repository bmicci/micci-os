'use client'

// Health Overview — KPIs, 7-day habit scorecard, trends, latest Health brief.
// Data is computed server-side (lib/health/overview.ts); this only renders.

import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Scatter, ComposedChart } from 'recharts'
import { ClipboardCheck, Check, X } from 'lucide-react'
import type { HealthOverview } from '@/lib/health/overview'
import { weekday } from '@/lib/health/dates'

const ACCENT = '#5ee6ff'
const tooltipStyle = {
  contentStyle: { background: 'var(--bg-elevated)', border: '1px solid var(--glass-line)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'rgba(240,246,255,0.6)' },
  itemStyle: { color: '#f0f6ff' },
}
const axis = { stroke: 'var(--text-muted)', fontSize: 10, tickLine: false, axisLine: false } as const
const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

function Kpi({ label, value, sub, empty }: { label: string; value: string | null; sub?: string; empty: string }) {
  return (
    <div className="glass-card p-4 min-w-0">
      <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      {value != null ? (
        <>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)' }}>{value}</div>
          {sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
        </>
      ) : (
        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{empty}</div>
      )}
    </div>
  )
}

function TrendCard({ title, sub, children, empty }: { title: string; sub?: string; children: React.ReactNode; empty?: string | null }) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {sub && <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      {empty ? (
        <div className="h-[160px] flex items-center justify-center text-[12px] text-center px-6" style={{ color: 'var(--text-muted)' }}>{empty}</div>
      ) : (
        <div style={{ width: '100%', height: 180 }}>{children}</div>
      )}
    </div>
  )
}

export default function OverviewTab({ overview: o, briefHeadline, briefDate }: {
  overview: HealthOverview
  briefHeadline: string | null
  briefDate: string | null
}) {
  const daily = o.trends.daily
  const anyDaily = (k: 'recovery' | 'hrv' | 'sleep') => daily.some(d => d[k] != null)
  const scanByDay = new Map(o.trends.scans.map(s => [s.day, s]))
  const weightData = o.trends.weight.map(w => ({ ...w, scan: scanByDay.has(w.day) ? w.weight : null }))

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      {/* Check-in CTA */}
      <Link href="/health/checkin"
        className="glass-card p-4 flex items-center justify-between gap-3"
        style={{ borderColor: o.loggedToday ? 'rgba(34,197,94,0.35)' : 'rgba(var(--accent-rgb), 0.45)' }}>
        <div className="flex items-center gap-3">
          <ClipboardCheck size={20} style={{ color: o.loggedToday ? '#22c55e' : ACCENT }} />
          <div>
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {o.loggedToday ? "Today's check-in is logged" : 'Log today’s check-in'}
            </div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{o.checkinsLast7} of last 7 days logged</div>
          </div>
        </div>
        <span className="text-[12px] font-semibold" style={{ color: ACCENT }}>{o.loggedToday ? 'Edit →' : 'Check in →'}</span>
      </Link>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Recovery" value={o.recovery.value != null ? `${Math.round(o.recovery.value)}%` : null}
          sub={o.recovery.day ? `WHOOP · ${shortDate(o.recovery.day)}` : undefined} empty="Connect WHOOP to see recovery" />
        <Kpi label="HRV" value={o.hrv.value != null ? `${Math.round(o.hrv.value)} ms` : null}
          sub={o.hrv.avg7 != null ? `7-day avg ${Math.round(o.hrv.avg7)} ms` : undefined} empty="Connect WHOOP to see HRV" />
        <Kpi label="Last night" value={o.sleep.hours != null ? `${o.sleep.hours.toFixed(1)} h` : null}
          sub={o.sleep.source === 'whoop' ? (o.sleep.performance != null ? `${Math.round(o.sleep.performance)}% performance` : 'WHOOP') : o.sleep.source === 'self' ? 'self-reported' : undefined}
          empty="Log sleep in your check-in" />
        <Kpi label="Nicotine-free" value={`${o.nicotineFreeDays} days`} sub="since Sep 14" empty="" />
        <Kpi label="Check-ins" value={`${o.checkinsLast7} / 7`} sub="last 7 days" empty="" />
      </div>

      {/* Latest brief */}
      {briefHeadline && (
        <Link href="/briefs" className="glass-card p-4 block">
          <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Health brief{briefDate ? ` · ${shortDate(briefDate)}` : ''}
          </div>
          <div className="text-[13.5px]" style={{ color: 'var(--text-primary)' }}>{briefHeadline}</div>
        </Link>
      )}

      {/* 7-day scorecard */}
      <div className="glass-card p-4 overflow-x-auto">
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Last 7 days</h3>
        <table className="w-full text-[12px]" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
          <thead>
            <tr>
              <th className="text-left font-normal pr-3" style={{ color: 'var(--text-muted)' }} />
              {o.days.map(d => (
                <th key={d} className="font-normal text-center px-1" style={{ color: 'var(--text-muted)' }}>{weekday(d).slice(0, 2)}</th>
              ))}
              <th className="font-normal text-right pl-3" style={{ color: 'var(--text-muted)' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {o.scorecard.map(row => (
              <tr key={row.key}>
                <td className="pr-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{row.label}</td>
                {row.cells.map((c, i) => (
                  <td key={i} className="text-center px-1">
                    <span title={`${row.label} · ${shortDate(o.days[i])}: ${c === 'done' ? 'done' : c === 'missed' ? 'missed' : 'not logged'}`}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md"
                      style={{
                        background: c === 'done' ? 'rgba(var(--accent-rgb), 0.22)' : c === 'missed' ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: c === 'none' ? '1px dashed rgba(255,255,255,0.12)' : 'none',
                      }}>
                      {c === 'done' ? <Check size={14} color={ACCENT} strokeWidth={3} /> : c === 'missed' ? <X size={12} color="var(--text-muted)" /> : null}
                    </span>
                  </td>
                ))}
                <td className="text-right pl-3 whitespace-nowrap" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono)' }}>
                  {row.logged ? `${row.hits} of ${row.logged}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10.5px] mt-2" style={{ color: 'var(--text-muted)' }}>✓ done · ✕ missed · dashed = no check-in that day</p>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendCard title="Weight (lb)" sub={o.trends.scans.length ? 'Larger dots are InBody scans' : 'From check-ins, Withings and InBody'}
          empty={weightData.length < 2 ? 'Log a weekly weigh-in or upload an InBody scan to start the trend.' : null}>
          <ResponsiveContainer>
            <ComposedChart data={weightData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDate} {...axis} minTickGap={24} />
              <YAxis domain={['dataMin - 3', 'dataMax + 3']} {...axis} width={44} />
              <Tooltip {...tooltipStyle} labelFormatter={(l) => shortDate(String(l))} formatter={(v, name) => [`${Number(v).toFixed(1)} lb`, name === 'scan' ? 'InBody' : 'Weight']} />
              <Line type="monotone" dataKey="weight" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Scatter dataKey="scan" fill={ACCENT} stroke="#050505" strokeWidth={2} shape="circle" r={6} />
            </ComposedChart>
          </ResponsiveContainer>
        </TrendCard>

        <TrendCard title="Recovery (%)" sub="WHOOP, last 14 days"
          empty={anyDaily('recovery') ? null : 'No WHOOP data yet. Connect WHOOP in Health → Devices.'}>
          <ResponsiveContainer>
            <LineChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDate} {...axis} minTickGap={24} />
              <YAxis domain={[0, 100]} {...axis} width={36} />
              <Tooltip {...tooltipStyle} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [`${Math.round(Number(v))}%`, 'Recovery']} />
              <Line type="monotone" dataKey="recovery" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </TrendCard>

        <TrendCard title="HRV (ms)" sub="WHOOP, last 14 days"
          empty={anyDaily('hrv') ? null : 'No WHOOP data yet. Connect WHOOP in Health → Devices.'}>
          <ResponsiveContainer>
            <LineChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDate} {...axis} minTickGap={24} />
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} {...axis} width={36} />
              <Tooltip {...tooltipStyle} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [`${Math.round(Number(v))} ms`, 'HRV']} />
              <Line type="monotone" dataKey="hrv" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </TrendCard>

        <TrendCard title="Sleep (hours)" sub="WHOOP when connected, otherwise your check-in"
          empty={anyDaily('sleep') ? null : 'Log sleep in your daily check-in, or connect WHOOP.'}>
          <ResponsiveContainer>
            <LineChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tickFormatter={shortDate} {...axis} minTickGap={24} />
              <YAxis domain={[0, 10]} {...axis} width={36} />
              <Tooltip {...tooltipStyle} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [`${Number(v).toFixed(1)} h`, 'Sleep']} />
              <Line type="monotone" dataKey="sleep" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </TrendCard>
      </div>

      {o.trends.scans.length > 0 && (
        <div className="glass-card p-4 overflow-x-auto">
          <h3 className="text-[13px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>InBody scans</h3>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left font-normal py-1">Date</th>
                <th className="text-right font-normal">Weight</th>
                <th className="text-right font-normal">Skeletal muscle</th>
                <th className="text-right font-normal">Body fat</th>
              </tr>
            </thead>
            <tbody>
              {[...o.trends.scans].reverse().map(s => (
                <tr key={s.day} style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono)' }}>
                  <td className="py-1">{shortDate(s.day)}</td>
                  <td className="text-right">{s.weight != null ? `${s.weight.toFixed(1)} lb` : '—'}</td>
                  <td className="text-right">{s.smm != null ? `${s.smm.toFixed(1)} lb` : '—'}</td>
                  <td className="text-right">{s.bodyFat != null ? `${s.bodyFat.toFixed(1)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
