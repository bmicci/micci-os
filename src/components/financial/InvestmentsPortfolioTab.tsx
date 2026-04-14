'use client'

import { useState, useMemo, useTransition, useRef, useCallback } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { DbPortfolioPosition, DbPortfolioTarget } from '@/types/database'
import { createClient } from '@supabase/supabase-js'

// ── Constants ─────────────────────────────────────────────────────

const YEAR_END_TARGET = 189053
const CURRENT_YEAR_START_VALUE = 143000 // approximate Jan 1 value for YTD calc

const THEME_COLORS: Record<string, string> = {
  'Tech/Growth':     '#00D4FF',
  'Broad Market':    '#1e90ff',
  'Semis':           '#c084fc',
  'Gold':            '#ffd93d',
  'Industrials':     '#fb923c',
  'Defense':         '#4ade80',
  'Blue Chips':      '#38bdf8',
  'Data Centers':    '#818cf8',
  'Dividends':       '#34d399',
  'Healthcare':      '#f472b6',
  'Robotics':        '#a78bfa',
  'Nuclear':         '#facc15',
  'Electrification': '#67e8f9',
  'Precious Metals': '#e5e7eb',
  'Liquidity':       '#6b7280',
}

// ── Formatters ────────────────────────────────────────────────────

const fmt  = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fmtD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtP = (n: number, plus = false) => `${plus && n > 0 ? '+' : ''}${n.toFixed(2)}%`

// ── Props ─────────────────────────────────────────────────────────

interface Props {
  positions: DbPortfolioPosition[]
  targets: DbPortfolioTarget[]
  totalValue: number
  totalCost: number
  totalGL: number
  totalGLPct: number
}

// ── KPI Card ──────────────────────────────────────────────────────

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(0,212,255,0.15)',
        borderRadius: 12,
        padding: '14px 18px',
        minWidth: 140,
      }}
    >
      <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</p>
      <p style={{ color: color ?? '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>{value}</p>
      {sub && <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

// ── Section Wrapper ───────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(0,212,255,0.12)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <h2 style={{ color: '#00D4FF', fontSize: 13, fontWeight: 600, marginBottom: 16, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── Action Badge ──────────────────────────────────────────────────

function ActionBadge({ action }: { action: string | null }) {
  if (!action) return null
  const colors: Record<string, { bg: string; color: string }> = {
    HOLD:   { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
    ADD:    { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
    TRIM:   { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
    NEW:    { bg: 'rgba(0,212,255,0.15)',   color: '#00D4FF' },
    DEPLOY: { bg: 'rgba(251,191,36,0.15)',  color: '#f59e0b' },
  }
  const c = colors[action] ?? { bg: 'rgba(255,255,255,0.1)', color: '#fff' }
  return (
    <span style={{ ...c, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, letterSpacing: '0.05em' }}>
      {action}
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────

export default function InvestmentsPortfolioTab({
  positions,
  targets,
  totalValue,
  totalCost,
  totalGL,
  totalGLPct,
}: Props) {
  const [updatingTicker, setUpdatingTicker] = useState('')
  const [updatePrice, setUpdatePrice]       = useState('')
  const [updateMsg, setUpdateMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [localPrices, setLocalPrices]       = useState<Record<string, number>>({})
  const [isPending, startTransition]        = useTransition()

  // Price refresh state
  const [refreshing, setRefreshing]         = useState(false)
  const [refreshMsg, setRefreshMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [lastRefreshed, setLastRefreshed]   = useState<string | null>(null)

  // CSV import state
  const [importing, setImporting]           = useState(false)
  const [importMsg, setImportMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const fileInputRef                        = useRef<HTMLInputElement>(null)

  // Suppress unused-variable warnings for server-passed totals
  void totalValue; void totalCost; void totalGL; void totalGLPct

  // Merge local optimistic price overrides
  const displayPositions = useMemo(() =>
    positions.map(p => {
      if (localPrices[p.ticker] !== undefined) {
        const price         = localPrices[p.ticker]
        const current_value = Number(p.shares) * price
        const cost_basis    = Number(p.cost_basis)
        return {
          ...p,
          current_price:     price,
          current_value,
          unrealized_gl:     current_value - cost_basis,
          unrealized_gl_pct: cost_basis > 0 ? ((current_value - cost_basis) / cost_basis) * 100 : 0,
        }
      }
      return p
    }),
    [positions, localPrices]
  )

  const effectiveTotalValue = displayPositions.reduce((s, p) => s + Number(p.current_value ?? 0), 0)
  const effectiveTotalCost  = displayPositions.reduce((s, p) => s + Number(p.cost_basis ?? 0), 0)
  const effectiveTotalGL    = effectiveTotalValue - effectiveTotalCost
  const effectiveTotalGLPct = effectiveTotalCost > 0 ? (effectiveTotalGL / effectiveTotalCost) * 100 : 0

  const ytdReturn = CURRENT_YEAR_START_VALUE > 0
    ? ((effectiveTotalValue - CURRENT_YEAR_START_VALUE) / CURRENT_YEAR_START_VALUE) * 100
    : 0

  const progressToTarget = YEAR_END_TARGET > 0 ? Math.min((effectiveTotalValue / YEAR_END_TARGET) * 100, 100) : 0

  // Build target map
  const targetMap = useMemo(() => {
    const m: Record<string, DbPortfolioTarget> = {}
    for (const t of targets) m[t.ticker] = t
    return m
  }, [targets])

  // Theme aggregation (current)
  const themeCurrentMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of displayPositions) {
      m[p.theme] = (m[p.theme] ?? 0) + Number(p.current_value ?? 0)
    }
    return m
  }, [displayPositions])

  // Theme aggregation (target %)
  const themeTargetMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of targets) {
      m[t.theme] = (m[t.theme] ?? 0) + t.target_pct
    }
    return m
  }, [targets])

  // All unique themes
  const allThemes = useMemo(() => {
    const s = new Set([...Object.keys(themeCurrentMap), ...Object.keys(themeTargetMap)])
    return Array.from(s)
  }, [themeCurrentMap, themeTargetMap])

  // Donut data
  const currentDonut = useMemo(() =>
    allThemes
      .filter(th => (themeCurrentMap[th] ?? 0) > 0)
      .map(th => ({ name: th, value: Math.round(themeCurrentMap[th] ?? 0) }))
      .sort((a, b) => b.value - a.value),
    [allThemes, themeCurrentMap]
  )

  const targetDonut = useMemo(() =>
    allThemes
      .filter(th => (themeTargetMap[th] ?? 0) > 0)
      .map(th => ({ name: th, value: themeTargetMap[th] ?? 0 }))
      .sort((a, b) => b.value - a.value),
    [allThemes, themeTargetMap]
  )

  // Holdings sorted by value desc
  const sortedPositions = useMemo(() =>
    [...displayPositions].sort((a, b) => Number(b.current_value) - Number(a.current_value)),
    [displayPositions]
  )

  // Theme drift (sorted biggest overweight first)
  const themeDrift = useMemo(() =>
    allThemes.map(th => {
      const currentAmt = themeCurrentMap[th] ?? 0
      const currentPct = effectiveTotalValue > 0 ? (currentAmt / effectiveTotalValue) * 100 : 0
      const targetPct  = themeTargetMap[th] ?? 0
      const drift      = currentPct - targetPct
      return { theme: th, currentAmt, currentPct, targetPct, drift }
    }).sort((a, b) => b.drift - a.drift),
    [allThemes, themeCurrentMap, effectiveTotalValue, themeTargetMap]
  )

  // Handle price update
  function handlePriceUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!updatingTicker || !updatePrice) return

    const price = parseFloat(updatePrice)
    if (isNaN(price) || price < 0) {
      setUpdateMsg({ type: 'err', text: 'Invalid price' })
      return
    }

    // Optimistic update
    setLocalPrices(prev => ({ ...prev, [updatingTicker]: price }))
    setUpdateMsg(null)

    startTransition(async () => {
      try {
        const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !anonKey) {
          setUpdateMsg({ type: 'err', text: 'Supabase env vars not set' })
          return
        }
        const supabase = createClient(url, anonKey)
        const { error } = await supabase
          .from('portfolio_positions')
          .update({ current_price: price, updated_at: new Date().toISOString() })
          .eq('ticker', updatingTicker)

        if (error) {
          setUpdateMsg({ type: 'err', text: error.message })
        } else {
          setUpdateMsg({ type: 'ok', text: `${updatingTicker} updated to ${fmtD(price)}` })
          setUpdatePrice('')
        }
      } catch (err) {
        setUpdateMsg({ type: 'err', text: String(err) })
      }
    })
  }

  // Handle bulk price refresh via Yahoo Finance API route
  const handleRefreshPrices = useCallback(async () => {
    setRefreshing(true)
    setRefreshMsg(null)
    try {
      const res  = await fetch('/api/investments/refresh-prices', { method: 'POST' })
      const json = await res.json() as { updated?: number; failed?: number; timestamp?: string; error?: string }
      if (!res.ok) {
        setRefreshMsg({ type: 'err', text: json.error ?? 'Refresh failed' })
      } else {
        setLastRefreshed(json.timestamp ?? new Date().toISOString())
        setRefreshMsg({
          type: 'ok',
          text: `Updated ${json.updated ?? 0} prices${json.failed ? ` · ${json.failed} failed` : ''}. Reload to see new values.`,
        })
      }
    } catch (err) {
      setRefreshMsg({ type: 'err', text: String(err) })
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Handle Chase CSV file import
  const handleCSVImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportMsg(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res  = await fetch('/api/investments/import-csv', { method: 'POST', body: formData })
      const json = await res.json() as { imported?: number; tickers?: string[]; warnings?: string[]; error?: string }
      if (!res.ok) {
        setImportMsg({ type: 'err', text: json.error ?? 'Import failed' })
      } else {
        const warn = json.warnings?.length ? ` (${json.warnings.join('; ')})` : ''
        setImportMsg({
          type: 'ok',
          text: `Imported ${json.imported ?? 0} positions: ${(json.tickers ?? []).join(', ')}${warn}. Reload to see updated values.`,
        })
      }
    } catch (err) {
      setImportMsg({ type: 'err', text: String(err) })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(0,212,255,0.15)',
    borderRadius: 12,
    padding: 20,
  }

  const thStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '8px 12px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  }

  const tdStyle: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: 12,
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── A. KPI Strip ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KPI label="Total Portfolio Value" value={fmt(effectiveTotalValue)} />
        <KPI label="Total Cost Basis"      value={fmt(effectiveTotalCost)}  sub="IRA-3509" />
        <KPI
          label="Unrealized G/L"
          value={`${effectiveTotalGL >= 0 ? '+' : ''}${fmt(effectiveTotalGL)}`}
          sub={fmtP(effectiveTotalGLPct, true)}
          color={effectiveTotalGL >= 0 ? '#22c55e' : '#ef4444'}
        />
        <KPI
          label="YTD Return"
          value={fmtP(ytdReturn, true)}
          color={ytdReturn >= 0 ? '#22c55e' : '#ef4444'}
        />
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: 12,
            padding: '14px 18px',
            minWidth: 220,
          }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>
            Progress to {fmt(YEAR_END_TARGET)} Target
          </p>
          <p style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{progressToTarget.toFixed(1)}%</p>
          <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <div
              style={{
                height: '100%',
                width: `${progressToTarget}%`,
                background: progressToTarget >= 100 ? '#22c55e' : '#00D4FF',
                borderRadius: 3,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>
            {effectiveTotalValue < YEAR_END_TARGET ? `${fmt(YEAR_END_TARGET - effectiveTotalValue)} to go` : 'Target reached! 🎉'}
          </p>
        </div>
      </div>

      {/* ── A2. Data Controls Bar ────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(0,212,255,0.1)',
          borderRadius: 12,
        }}
      >
        {/* Refresh Prices */}
        <button
          onClick={handleRefreshPrices}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: refreshing ? 'rgba(0,212,255,0.06)' : 'rgba(0,212,255,0.12)',
            border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: 8,
            color: '#00D4FF',
            fontSize: 12,
            fontWeight: 600,
            padding: '7px 14px',
            cursor: refreshing ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: 14 }}>{refreshing ? '⏳' : '🔄'}</span>
          {refreshing ? 'Fetching prices…' : 'Refresh Prices'}
        </button>

        {/* CSV Import */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: importing ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 8,
            color: '#f59e0b',
            fontSize: 12,
            fontWeight: 600,
            padding: '7px 14px',
            cursor: importing ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: 14 }}>{importing ? '⏳' : '📂'}</span>
          {importing ? 'Importing…' : 'Import Chase CSV'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleCSVImport}
            disabled={importing}
            style={{ display: 'none' }}
          />
        </label>

        {/* Status / timestamps */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {refreshMsg && (
            <p style={{ fontSize: 11, color: refreshMsg.type === 'ok' ? '#22c55e' : '#ef4444', margin: 0 }}>
              {refreshMsg.type === 'ok' ? '✓ ' : '✗ '}{refreshMsg.text}
            </p>
          )}
          {importMsg && (
            <p style={{ fontSize: 11, color: importMsg.type === 'ok' ? '#22c55e' : '#ef4444', margin: 0, marginTop: refreshMsg ? 4 : 0 }}>
              {importMsg.type === 'ok' ? '✓ ' : '✗ '}{importMsg.text}
            </p>
          )}
          {!refreshMsg && !importMsg && lastRefreshed && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              Last refreshed: {new Date(lastRefreshed).toLocaleTimeString()}
            </p>
          )}
          {!refreshMsg && !importMsg && !lastRefreshed && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              Prices auto-refresh every 30 min on weekdays · or click to refresh now
            </p>
          )}
        </div>
      </div>

      {/* ── B. Holdings Table ─────────────────────────────────────── */}
      <Section title="Holdings">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ticker','Name','Theme','Action','Shares','Price','Value','% Port','Cost Basis','Unreal G/L','G/L %','vs Target'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPositions.map(p => {
                const val       = Number(p.current_value ?? 0)
                const pctPort   = effectiveTotalValue > 0 ? (val / effectiveTotalValue) * 100 : 0
                const target    = targetMap[p.ticker]
                const targetPct = target?.target_pct ?? 0
                const drift     = pctPort - targetPct
                const gl        = Number(p.unrealized_gl ?? 0)
                const glPct     = Number(p.unrealized_gl_pct ?? 0)
                const hasPurchased = Number(p.shares) > 0

                return (
                  <tr key={p.id} style={{ opacity: hasPurchased ? 1 : 0.5 }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#00D4FF' }}>{p.ticker}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: `${THEME_COLORS[p.theme] ?? '#888'}22`,
                        color: THEME_COLORS[p.theme] ?? '#888',
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: 6,
                      }}>
                        {p.theme}
                      </span>
                    </td>
                    <td style={tdStyle}><ActionBadge action={target?.action ?? null} /></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {hasPurchased ? Number(p.shares).toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {hasPurchased ? fmtD(Number(p.current_price)) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                      {hasPurchased ? fmt(val) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {hasPurchased ? fmtP(pctPort) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>
                      {hasPurchased ? fmt(Number(p.cost_basis)) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: gl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {hasPurchased ? `${gl >= 0 ? '+' : ''}${fmt(gl)}` : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: glPct >= 0 ? '#22c55e' : '#ef4444' }}>
                      {hasPurchased ? fmtP(glPct, true) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {targetPct > 0 ? (
                        <span style={{
                          color:      drift > 1 ? '#ef4444' : drift < -1 ? '#22c55e' : '#94a3b8',
                          fontWeight: 600,
                          fontSize:   11,
                        }}>
                          {drift > 1 ? `TRIM ${fmtP(drift, true)}` : drift < -1 ? `ADD ${fmtP(Math.abs(drift))}` : 'ON TARGET'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── C. Allocation Donuts ──────────────────────────────────── */}
      <Section title="Allocation: Current vs Target">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
              Current Allocation ({fmt(effectiveTotalValue)})
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={currentDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {currentDonut.map(entry => (
                    <Cell key={entry.name} fill={THEME_COLORS[entry.name] ?? '#888'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => [fmt(Number(value ?? 0)), 'Value']}
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  formatter={(value: string) => <span style={{ fontSize: 11, color: '#94a3b8' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
              Target Allocation (Feb 2026 Playbook)
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={targetDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {targetDonut.map(entry => (
                    <Cell key={entry.name} fill={THEME_COLORS[entry.name] ?? '#888'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => [`${Number(value ?? 0).toFixed(1)}%`, 'Target']}
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  formatter={(value: string) => <span style={{ fontSize: 11, color: '#94a3b8' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* ── D. Theme Drift Table ──────────────────────────────────── */}
      <Section title="Theme Drift Analysis">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Theme','Current $','Current %','Target %','Drift','Signal'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {themeDrift.map(({ theme, currentAmt, currentPct, targetPct, drift }) => {
                const isOver      = drift > 1
                const isUnder     = drift < -1
                const driftColor  = isOver ? '#ef4444' : isUnder ? '#22c55e' : '#94a3b8'
                const signal      = isOver ? 'TRIM' : isUnder ? 'ADD' : 'ON TARGET'

                return (
                  <tr key={theme}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: THEME_COLORS[theme] ?? '#888', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{theme}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{currentAmt > 0 ? fmt(currentAmt) : '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{currentAmt > 0 ? fmtP(currentPct) : '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#00D4FF' }}>{targetPct > 0 ? fmtP(targetPct) : '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: driftColor, fontWeight: 700 }}>
                      {drift >= 0 ? '+' : ''}{fmtP(drift)}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: driftColor, fontSize: 11, fontWeight: 600 }}>{signal}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── E. Scenario Projections ───────────────────────────────── */}
      <Section title="Year-End Scenario Projections">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
          {([
            { label: 'Conservative', pct: 5.4,  emoji: '🐻', color: '#94a3b8' },
            { label: 'Base',         pct: 13.9, emoji: '📊', color: '#00D4FF' },
            { label: 'Bull',         pct: 23.8, emoji: '🚀', color: '#22c55e' },
          ] as const).map(sc => {
            const projected   = effectiveTotalValue * (1 + sc.pct / 100)
            const pctOfTarget = Math.min((projected / YEAR_END_TARGET) * 100, 120)
            const hitsTarget  = projected >= YEAR_END_TARGET
            return (
              <div key={sc.label} style={{ ...card, textAlign: 'center' }}>
                <p style={{ fontSize: 20, marginBottom: 4 }}>{sc.emoji}</p>
                <p style={{ color: sc.color, fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{sc.label}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>+{sc.pct}% return</p>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>{fmt(projected)}</p>
                <p style={{ color: hitsTarget ? '#22c55e' : '#f59e0b', fontSize: 11, marginTop: 4, marginBottom: 12 }}>
                  {hitsTarget ? '✓ Hits $189K target' : `${fmt(YEAR_END_TARGET - projected)} short`}
                </p>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(pctOfTarget, 100)}%`,
                    background: sc.color,
                    borderRadius: 3,
                    transition: 'width 0.5s',
                  }} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>
                  {pctOfTarget.toFixed(0)}% of target
                </p>
              </div>
            )
          })}
        </div>
        <div style={{ ...card, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
            Current value vs year-end target of {fmt(YEAR_END_TARGET)}
          </p>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, margin: '0 auto', maxWidth: 600 }}>
            <div style={{
              height: '100%',
              width: `${progressToTarget}%`,
              background: 'linear-gradient(90deg, #00D4FF, #22c55e)',
              borderRadius: 6,
            }} />
          </div>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginTop: 8 }}>
            {fmt(effectiveTotalValue)} / {fmt(YEAR_END_TARGET)} — {progressToTarget.toFixed(1)}% there
          </p>
        </div>
      </Section>

      {/* ── F. Position Update Panel ──────────────────────────────── */}
      <Section title="Update Position Price">
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
          Manually refresh a price without re-importing. Saves to Supabase; page reflects change immediately.
        </p>
        <form onSubmit={handlePriceUpdate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>Ticker</label>
            <select
              value={updatingTicker}
              onChange={e => setUpdatingTicker(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                padding: '8px 12px',
                fontSize: 13,
                cursor: 'pointer',
                minWidth: 160,
              }}
            >
              <option value="">Select ticker…</option>
              {positions
                .filter(p => Number(p.shares) > 0 && !p.is_cash)
                .sort((a, b) => a.ticker.localeCompare(b.ticker))
                .map(p => (
                  <option key={p.ticker} value={p.ticker}>
                    {p.ticker} ({fmtD(Number(p.current_price))})
                  </option>
                ))
              }
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>New Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={updatePrice}
              onChange={e => setUpdatePrice(e.target.value)}
              placeholder="e.g. 625.50"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 8,
                color: '#fff',
                padding: '8px 12px',
                fontSize: 13,
                width: 140,
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !updatingTicker || !updatePrice}
            style={{
              background: isPending ? 'rgba(0,212,255,0.1)' : 'rgba(0,212,255,0.2)',
              border: '1px solid rgba(0,212,255,0.4)',
              borderRadius: 8,
              color: '#00D4FF',
              fontWeight: 600,
              fontSize: 13,
              padding: '8px 20px',
              cursor: isPending ? 'wait' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isPending ? 'Updating…' : 'Update Price'}
          </button>
        </form>
        {updateMsg && (
          <p style={{
            marginTop: 12,
            fontSize: 12,
            color:     updateMsg.type === 'ok' ? '#22c55e' : '#ef4444',
            fontWeight: 600,
          }}>
            {updateMsg.type === 'ok' ? '✓ ' : '✗ '}{updateMsg.text}
          </p>
        )}
      </Section>

    </div>
  )
}
