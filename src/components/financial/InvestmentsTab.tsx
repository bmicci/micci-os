'use client'

import { useMemo, useState } from 'react'
import type { InvestmentData, TaxLot } from '@/lib/financial-data'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

// ── Helpers ──────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

const fmtShares = (n: number) =>
  n < 1 ? n.toFixed(6) : n < 100 ? n.toFixed(4) : n.toFixed(2)

const COLORS = [
  '#00d4ff', '#1e90ff', '#00e5a0', '#ff6b6b', '#ffd93d',
  '#c084fc', '#fb923c', '#67e8f9', '#a78bfa', '#34d399',
  '#f472b6', '#facc15', '#38bdf8', '#818cf8', '#4ade80',
]

// ── Sub-views ────────────────────────────────────────────────────

type SubView = 'overview' | 'positions' | 'taxlots' | 'history'

const SUB_VIEWS: { id: SubView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'positions', label: 'Positions' },
  { id: 'taxlots', label: 'Tax Lots' },
  { id: 'history', label: 'Trade History' },
]

// ── Types for aggregated data ────────────────────────────────────

interface PositionGroup {
  ticker: string
  description: string
  assetClass: string
  assetStrategy: string
  totalQuantity: number
  totalValue: number
  totalCost: number
  unrealizedGL: number
  unrealizedGLPct: number
  price: number
  estAnnualIncome: number
  lots: TaxLot[]
}

// ── Main Component ───────────────────────────────────────────────

export default function InvestmentsTab({ investments }: { investments: InvestmentData }) {
  const [subView, setSubView] = useState<SubView>('overview')

  // Aggregate tax lots by ticker into positions
  const positions = useMemo<PositionGroup[]>(() => {
    const map = new Map<string, PositionGroup>()

    for (const lot of investments.taxLots) {
      const existing = map.get(lot.ticker)
      if (existing) {
        existing.totalQuantity += lot.quantity
        existing.totalValue += lot.value ?? 0
        existing.totalCost += lot.cost ?? 0
        existing.unrealizedGL += lot.unrealizedGL ?? 0
        existing.estAnnualIncome += lot.estAnnualIncome ?? 0
        existing.lots.push(lot)
      } else {
        map.set(lot.ticker, {
          ticker: lot.ticker,
          description: lot.description ?? lot.ticker,
          assetClass: lot.assetClass ?? 'Other',
          assetStrategy: lot.assetStrategy ?? 'Other',
          totalQuantity: lot.quantity,
          totalValue: lot.value ?? 0,
          totalCost: lot.cost ?? 0,
          unrealizedGL: lot.unrealizedGL ?? 0,
          unrealizedGLPct: 0,
          price: lot.price ?? 0,
          estAnnualIncome: lot.estAnnualIncome ?? 0,
          lots: [lot],
        })
      }
    }

    // Compute pct after aggregation
    for (const pos of map.values()) {
      pos.unrealizedGLPct = pos.totalCost > 0 ? (pos.unrealizedGL / pos.totalCost) * 100 : 0
    }

    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue)
  }, [investments.taxLots])

  // Account-level KPIs
  const kpis = useMemo(() => {
    const totalValue = positions.reduce((s, p) => s + p.totalValue, 0)
    const totalCost = positions.reduce((s, p) => s + p.totalCost, 0)
    const totalGL = positions.reduce((s, p) => s + p.unrealizedGL, 0)
    const totalIncome = positions.reduce((s, p) => s + p.estAnnualIncome, 0)
    const glPct = totalCost > 0 ? (totalGL / totalCost) * 100 : 0

    const shortLots = investments.taxLots.filter(l => l.taxTerm === 'Short')
    const longLots = investments.taxLots.filter(l => l.taxTerm === 'Long')
    const shortValue = shortLots.reduce((s, l) => s + (l.value ?? 0), 0)
    const longValue = longLots.reduce((s, l) => s + (l.value ?? 0), 0)

    return { totalValue, totalCost, totalGL, glPct, totalIncome, shortValue, longValue, totalPositions: positions.length, totalLots: investments.taxLots.length }
  }, [positions, investments.taxLots])

  // Allocation by strategy
  const strategyData = useMemo(() => {
    const map = new Map<string, number>()
    for (const pos of positions) {
      const key = pos.assetStrategy || 'Other'
      map.set(key, (map.get(key) ?? 0) + pos.totalValue)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [positions])

  // Positions bar chart (top 10 by value)
  const topPositions = useMemo(() => {
    return positions
      .filter(p => p.ticker !== 'QDERQ') // Exclude cash sweep
      .slice(0, 10)
      .map(p => ({
        ticker: p.ticker,
        value: Math.round(p.totalValue * 100) / 100,
        gl: Math.round(p.unrealizedGL * 100) / 100,
      }))
  }, [positions])

  const hasData = investments.taxLots.length > 0 || investments.transactions.length > 0

  if (!hasData) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No Investment Data Yet</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
          Import your brokerage CSV files (tax lots or transaction history) using the Import tool to see your investment dashboard.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Sub-nav */}
      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--card-border)', paddingBottom: 0 }}>
        {SUB_VIEWS.map(sv => (
          <button
            key={sv.id}
            onClick={() => setSubView(sv.id)}
            style={{
              padding: '8px 16px',
              background: subView === sv.id ? 'rgba(0,212,255,0.08)' : 'transparent',
              border: 'none',
              borderBottom: subView === sv.id ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: subView === sv.id ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            {sv.label}
          </button>
        ))}
      </nav>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <KPICard label="Total Value" value={fmt(kpis.totalValue)} />
        <KPICard label="Cost Basis" value={fmt(kpis.totalCost)} />
        <KPICard
          label="Unrealized G/L"
          value={fmt(kpis.totalGL)}
          sub={fmtPct(kpis.glPct)}
          positive={kpis.totalGL >= 0}
        />
        <KPICard label="Est. Annual Income" value={fmt(kpis.totalIncome)} />
        <KPICard label="Positions / Lots" value={`${kpis.totalPositions} / ${kpis.totalLots}`} />
      </div>

      {/* Content area */}
      {subView === 'overview' && (
        <OverviewView
          strategyData={strategyData}
          topPositions={topPositions}
          kpis={kpis}
        />
      )}
      {subView === 'positions' && <PositionsView positions={positions} totalValue={kpis.totalValue} />}
      {subView === 'taxlots' && <TaxLotsView lots={investments.taxLots} />}
      {subView === 'history' && <HistoryView transactions={investments.transactions} />}
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  positive,
}: {
  label: string
  value: string
  sub?: string
  positive?: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 12,
        padding: '16px 14px',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700 }}>{value}</div>
      {sub && (
        <div style={{ color: positive ? '#00e5a0' : '#ff6b6b', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Overview View ────────────────────────────────────────────────

function OverviewView({
  strategyData,
  topPositions,
  kpis,
}: {
  strategyData: { name: string; value: number }[]
  topPositions: { ticker: string; value: number; gl: number }[]
  kpis: { shortValue: number; longValue: number; totalValue: number }
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Allocation Donut */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          padding: 20,
          backdropFilter: 'blur(20px)',
        }}
      >
        <h4 style={{ color: 'var(--text-primary)', margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>
          Allocation by Strategy
        </h4>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={strategyData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {strategyData.map((_entry, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(10,14,39,0.95)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                formatter={(val: number | undefined) => fmt(val ?? 0)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 8 }}>
          {strategyData.map((s, i) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
              <span style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Positions Bar */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          padding: 20,
          backdropFilter: 'blur(20px)',
        }}
      >
        <h4 style={{ color: 'var(--text-primary)', margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>
          Top 10 Positions by Value
        </h4>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPositions} layout="vertical" margin={{ left: 40, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} stroke="var(--text-muted)" fontSize={11} />
              <YAxis type="category" dataKey="ticker" stroke="var(--text-muted)" fontSize={11} width={45} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(10,14,39,0.95)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
                formatter={(val: number | undefined) => fmt(val ?? 0)}
              />
              <Bar dataKey="value" fill="var(--accent-cyan)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tax Term Breakdown */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          padding: 20,
          backdropFilter: 'blur(20px)',
          gridColumn: '1 / -1',
        }}
      >
        <h4 style={{ color: 'var(--text-primary)', margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
          Tax Term Breakdown
        </h4>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Short-Term</div>
            <div style={{ color: '#ff6b6b', fontSize: 22, fontWeight: 700 }}>{fmt(kpis.shortValue)}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {kpis.totalValue > 0 ? ((kpis.shortValue / kpis.totalValue) * 100).toFixed(1) : '0'}% of portfolio
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Long-Term</div>
            <div style={{ color: '#00e5a0', fontSize: 22, fontWeight: 700 }}>{fmt(kpis.longValue)}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {kpis.totalValue > 0 ? ((kpis.longValue / kpis.totalValue) * 100).toFixed(1) : '0'}% of portfolio
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Roth Conversion Note</div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: 13 }}>
              2026 is a low-income year — consider converting up to $23K at 22% bracket before Dec 31.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Positions View ───────────────────────────────────────────────

function PositionsView({ positions, totalValue }: { positions: PositionGroup[]; totalValue: number }) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
        padding: 20,
        backdropFilter: 'blur(20px)',
        overflowX: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
            {['Ticker', 'Name', 'Strategy', 'Shares', 'Price', 'Value', 'Cost', 'G/L', 'G/L %', '% Port', 'Est. Income'].map(h => (
              <th
                key={h}
                style={{
                  textAlign: h === 'Ticker' || h === 'Name' || h === 'Strategy' ? 'left' : 'right',
                  padding: '10px 8px',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => {
            const isGain = pos.unrealizedGL >= 0
            const pctPort = totalValue > 0 ? (pos.totalValue / totalValue) * 100 : 0
            return (
              <tr
                key={pos.ticker}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <td style={{ padding: '10px 8px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  {pos.ticker}
                </td>
                <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pos.description}
                </td>
                <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontSize: 11 }}>
                  {pos.assetStrategy}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {fmtShares(pos.totalQuantity)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  ${pos.price.toFixed(2)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {fmt(pos.totalValue)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {fmt(pos.totalCost)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: isGain ? '#00e5a0' : '#ff6b6b', fontWeight: 500 }}>
                  {fmt(pos.unrealizedGL)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: isGain ? '#00e5a0' : '#ff6b6b' }}>
                  {fmtPct(pos.unrealizedGLPct)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {pctPort.toFixed(1)}%
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {pos.estAnnualIncome > 0 ? fmt(pos.estAnnualIncome) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Tax Lots View ────────────────────────────────────────────────

function TaxLotsView({ lots }: { lots: TaxLot[] }) {
  const [sortBy, setSortBy] = useState<'value' | 'gl' | 'date' | 'ticker'>('value')

  const sorted = useMemo(() => {
    const copy = [...lots]
    switch (sortBy) {
      case 'value':
        return copy.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      case 'gl':
        return copy.sort((a, b) => (b.unrealizedGL ?? 0) - (a.unrealizedGL ?? 0))
      case 'date':
        return copy.sort((a, b) => (a.acquisitionDate ?? '').localeCompare(b.acquisitionDate ?? ''))
      case 'ticker':
        return copy.sort((a, b) => a.ticker.localeCompare(b.ticker))
    }
  }, [lots, sortBy])

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
        padding: 20,
        backdropFilter: 'blur(20px)',
        overflowX: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: 14, fontWeight: 600 }}>
          {lots.length} Tax Lots
        </h4>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['value', 'gl', 'date', 'ticker'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                padding: '4px 10px',
                background: sortBy === s ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)',
                border: '1px solid',
                borderColor: sortBy === s ? 'var(--accent-cyan)' : 'transparent',
                borderRadius: 6,
                color: sortBy === s ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {s === 'gl' ? 'G/L' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
            {['Ticker', 'Acquired', 'Tax Term', 'Qty', 'Unit Cost', 'Price', 'Cost', 'Value', 'G/L', 'G/L %', 'Days Held'].map(h => (
              <th
                key={h}
                style={{
                  textAlign: h === 'Ticker' || h === 'Tax Term' ? 'left' : 'right',
                  padding: '8px 6px',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((lot, i) => {
            const isGain = (lot.unrealizedGL ?? 0) >= 0
            return (
              <tr key={`${lot.ticker}-${lot.acquisitionDate}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '8px 6px', color: 'var(--accent-cyan)', fontWeight: 600, fontSize: 12 }}>{lot.ticker}</td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {lot.acquisitionDate ?? '—'}
                </td>
                <td style={{ padding: '8px 6px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      background: lot.taxTerm === 'Long' ? 'rgba(0,229,160,0.12)' : 'rgba(255,107,107,0.12)',
                      color: lot.taxTerm === 'Long' ? '#00e5a0' : '#ff6b6b',
                    }}
                  >
                    {lot.taxTerm ?? '?'}
                  </span>
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtShares(lot.quantity)}</td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {lot.unitCost != null ? `$${lot.unitCost.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {lot.price != null ? `$${lot.price.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {lot.cost != null ? fmt(lot.cost) : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {lot.value != null ? fmt(lot.value) : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: isGain ? '#00e5a0' : '#ff6b6b', fontWeight: 500 }}>
                  {lot.unrealizedGL != null ? fmt(lot.unrealizedGL) : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: isGain ? '#00e5a0' : '#ff6b6b' }}>
                  {lot.unrealizedGLPct != null ? fmtPct(lot.unrealizedGLPct) : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-muted)' }}>
                  {lot.daysHeld ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── History View ─────────────────────────────────────────────────

function HistoryView({ transactions }: { transactions: InvestmentData['transactions'] }) {
  const typeColors: Record<string, string> = {
    Buy: '#00d4ff',
    Sell: '#ff6b6b',
    Dividend: '#00e5a0',
    'STK SPLT': '#c084fc',
    BNK: '#ffd93d',
    WDL: '#fb923c',
    DBS: '#67e8f9',
  }

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
        padding: 20,
        backdropFilter: 'blur(20px)',
        overflowX: 'auto',
      }}
    >
      <h4 style={{ color: 'var(--text-primary)', margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
        {transactions.length} Transactions
      </h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
            {['Date', 'Type', 'Ticker', 'Description', 'Qty', 'Price', 'Amount', 'Income', 'G/L'].map(h => (
              <th
                key={h}
                style={{
                  textAlign: h === 'Date' || h === 'Type' || h === 'Ticker' || h === 'Description' ? 'left' : 'right',
                  padding: '8px 6px',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn, i) => {
            const gl = (txn.glShort ?? 0) + (txn.glLong ?? 0)
            return (
              <tr key={`${txn.tradeDate}-${txn.ticker}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{txn.tradeDate}</td>
                <td style={{ padding: '8px 6px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      background: `${typeColors[txn.transactionType] ?? 'var(--text-muted)'}20`,
                      color: typeColors[txn.transactionType] ?? 'var(--text-muted)',
                    }}
                  >
                    {txn.transactionType}
                  </span>
                </td>
                <td style={{ padding: '8px 6px', color: 'var(--accent-cyan)', fontWeight: 600 }}>{txn.ticker ?? '—'}</td>
                <td style={{ padding: '8px 6px', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {txn.description ?? '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {txn.quantity != null && txn.quantity !== 0 ? fmtShares(txn.quantity) : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {txn.price != null && txn.price > 0 ? `$${txn.price.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {txn.amount != null ? fmt(txn.amount) : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#00e5a0' }}>
                  {txn.income != null && txn.income > 0 ? fmt(txn.income) : '—'}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', color: gl >= 0 ? '#00e5a0' : '#ff6b6b' }}>
                  {gl !== 0 ? fmt(gl) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
