'use client'

import { useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

type DataType = 'auto' | 'debt_accounts' | 'subscriptions' | 'budget_categories' | 'transactions'
type ImportMode = 'replace' | 'upsert'
type Stage = 'idle' | 'parsing' | 'preview' | 'committing' | 'done' | 'error'

interface ParseResult {
  detectedType: 'debt_accounts' | 'subscriptions' | 'budget_categories' | 'transactions'
  headers: string[]
  columnMap: Record<string, string>
  rows: Record<string, unknown>[]
  sheetName: string
  totalRaw: number
  totalParsed: number
  bankFormat?: string
  accountName?: string
}

interface CommitResult {
  imported: number
  errors: number
  dataType: string
  mode: string
  skipped?: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const DATA_TYPE_LABELS: Record<string, string> = {
  debt_accounts: 'Debt Accounts',
  subscriptions: 'Subscriptions',
  budget_categories: 'Budget Categories',
  transactions: 'Transactions',
}

const DATA_TYPE_DESCRIPTIONS: Record<string, string> = {
  debt_accounts: 'Balance, interest rate, minimum payment per account',
  subscriptions: 'Monthly/annual costs, keep/cancel/review decisions',
  budget_categories: 'Monthly actual, annual actual, survival budget targets',
  transactions: 'Bank/credit card statements — Chase, AmEx, BofA CSV auto-detected',
}

const DATA_TYPE_ICONS: Record<string, string> = {
  debt_accounts: '💳',
  subscriptions: '🔄',
  budget_categories: '📊',
  transactions: '🧾',
}

const ACCOUNT_PRESETS = [
  'AmEx Gold',
  'AmEx Platinum',
  'Chase Freedom Unlimited',
  'Chase Freedom',
  'Chase Prime',
  'Chase Checking',
  'Citi Diamond',
  'Citi Best Buy',
]

// ── Preview table columns per data type ───────────────────────────────────

const PREVIEW_COLS: Record<string, { key: string; label: string; format?: (v: unknown) => string }[]> = {
  debt_accounts: [
    { key: 'name', label: 'Account' },
    { key: 'account_type', label: 'Type' },
    {
      key: 'balance',
      label: 'Balance',
      format: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    { key: 'interest_rate', label: 'Rate', format: (v) => `${Number(v).toFixed(2)}%` },
    {
      key: 'minimum_payment',
      label: 'Min Payment',
      format: (v) => (v != null ? `$${Number(v).toFixed(0)}` : '—'),
    },
    { key: 'notes', label: 'Notes', format: (v) => String(v ?? '—').slice(0, 40) },
  ],
  subscriptions: [
    { key: 'name', label: 'Service' },
    {
      key: 'amount',
      label: 'Monthly',
      format: (v) => `$${Number(v).toFixed(2)}`,
    },
    { key: 'billing_cycle', label: 'Cycle' },
    { key: 'action', label: 'Action' },
    { key: 'category', label: 'Category', format: (v) => String(v ?? '—') },
  ],
  budget_categories: [
    { key: 'name', label: 'Category' },
    {
      key: 'monthly_actual',
      label: 'Monthly Actual',
      format: (v) => (v != null ? `$${Number(v).toLocaleString()}` : '—'),
    },
    {
      key: 'annual_actual',
      label: 'Annual Actual',
      format: (v) => (v != null ? `$${Number(v).toLocaleString()}` : '—'),
    },
    {
      key: 'survival_budget',
      label: 'Survival Budget',
      format: (v) => (v != null ? `$${Number(v).toLocaleString()}` : '—'),
    },
  ],
  transactions: [
    { key: 'transaction_date', label: 'Date' },
    { key: 'merchant', label: 'Merchant', format: (v) => String(v ?? '').slice(0, 40) },
    {
      key: 'amount',
      label: 'Amount',
      format: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    },
    { key: 'category', label: 'Category' },
    { key: 'account_name', label: 'Account' },
    {
      key: 'is_credit',
      label: 'Type',
      format: (v) => (v ? 'Credit' : 'Charge'),
    },
  ],
}

// ── Action badge colors ────────────────────────────────────────────────────

function getActionColor(action: string): { bg: string; color: string; border: string } {
  switch (action) {
    case 'cancel':
      return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' }
    case 'keep':
      return { bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.25)' }
    case 'essential':
      return { bg: 'rgba(30,144,255,0.1)', color: '#1e90ff', border: 'rgba(30,144,255,0.25)' }
    default:
      return { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.25)' }
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ImportCenter() {
  const [stage, setStage] = useState<Stage>('idle')
  const [dataType, setDataType] = useState<DataType>('auto')
  const [importMode, setImportMode] = useState<ImportMode>('replace')
  const [isDragging, setIsDragging] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [accountName, setAccountName] = useState<string>('')

  const handleFile = useCallback(
    async (file: File) => {
      // Require account name for transactions
      if (dataType === 'transactions' && !accountName.trim()) {
        setErrorMsg('Please enter an account name before uploading (e.g. "AmEx Gold")')
        setStage('error')
        return
      }

      setFileName(file.name)
      setErrorMsg(null)
      setParseResult(null)
      setCommitResult(null)
      setStage('parsing')

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('dataType', dataType)
        if (accountName.trim()) {
          formData.append('accountName', accountName.trim())
        }

        const res = await fetch('/api/import', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Parse failed')
        }

        setParseResult(data as ParseResult)
        setStage('preview')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
        setStage('error')
      }
    },
    [dataType, accountName]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  const handleCommit = useCallback(async () => {
    if (!parseResult) return

    setStage('committing')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parseResult.rows,
          dataType: parseResult.detectedType,
          mode: parseResult.detectedType === 'transactions' ? 'upsert' : importMode,
          accountName: parseResult.accountName || accountName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setCommitResult(data as CommitResult)
      setStage('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setStage('error')
    }
  }, [parseResult, importMode, accountName])

  const reset = () => {
    setStage('idle')
    setParseResult(null)
    setCommitResult(null)
    setErrorMsg(null)
    setFileName(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Data Type Selector ── */}
      {(stage === 'idle' || stage === 'error') && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: '24px',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h3
            style={{
              color: 'var(--text-secondary)',
              fontSize: 11,
              fontFamily: 'var(--font-geist-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 16,
            }}
          >
            What are you importing?
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(['auto', 'debt_accounts', 'subscriptions', 'budget_categories', 'transactions'] as DataType[]).map((t) => (
              <button
                key={t}
                onClick={() => setDataType(t)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: `1px solid ${
                    dataType === t ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.08)'
                  }`,
                  background: dataType === t ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)',
                  color: dataType === t ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>
                  {t === 'auto' ? '✨' : DATA_TYPE_ICONS[t]}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {t === 'auto' ? 'Auto-detect' : DATA_TYPE_LABELS[t]}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {t === 'auto' ? 'Claude detects the format' : DATA_TYPE_DESCRIPTIONS[t]}
                </div>
              </button>
            ))}
          </div>

          {/* Import Mode */}
          <div className="flex items-center gap-4 mt-5">
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-geist-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Mode:
            </span>
            {(['replace', 'upsert'] as ImportMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setImportMode(m)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  border: `1px solid ${
                    importMode === m ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'
                  }`,
                  background: importMode === m ? 'rgba(0,212,255,0.08)' : 'transparent',
                  color: importMode === m ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'replace' ? '🔄 Replace All' : '➕ Merge / Upsert'}
              </button>
            ))}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {importMode === 'replace'
                ? 'Clears the table first, then imports'
                : 'Matches by name, adds new / updates existing'}
            </span>
          </div>

          {/* Account Name — transactions only */}
          {dataType === 'transactions' && (
            <div className="mt-5">
              <label
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-geist-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Account Name *
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. AmEx Gold"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1px solid ${accountName ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    width: 220,
                    outline: 'none',
                  }}
                />
                <div className="flex gap-2 flex-wrap">
                  {ACCOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAccountName(preset)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: `1px solid ${accountName === preset ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        background: accountName === preset ? 'rgba(0,212,255,0.08)' : 'transparent',
                        color: accountName === preset ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                This tags every transaction with the card/account it came from. Auto-detects Chase, AmEx, BofA CSV formats.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Drop Zone ── */}
      {(stage === 'idle' || stage === 'error') && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: '32px',
            backdropFilter: 'blur(20px)',
          }}
        >
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: '48px 24px',
              border: `2px dashed ${isDragging ? 'rgba(0,212,255,0.8)' : 'rgba(0,212,255,0.25)'}`,
              borderRadius: 12,
              cursor: 'pointer',
              background: isDragging ? 'rgba(0,212,255,0.04)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
            <span style={{ fontSize: 48 }}>📥</span>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                Drop your Excel or CSV file here
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                XLSX · XLS · CSV — click to browse
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              {['HELOC Plan.xlsx', 'Subscriptions.csv', 'Budget 2026.xlsx'].map((ex) => (
                <span
                  key={ex}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(0,212,255,0.06)',
                    border: '1px solid rgba(0,212,255,0.15)',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-geist-mono)',
                  }}
                >
                  {ex}
                </span>
              ))}
            </div>
          </label>

          {stage === 'error' && errorMsg && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
                fontSize: 13,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* ── Parsing Spinner ── */}
      {stage === 'parsing' && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: '60px 32px',
            backdropFilter: 'blur(20px)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: 6 }}>
            Parsing {fileName}...
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Detecting columns and mapping data types
          </p>
        </div>
      )}

      {/* ── Preview ── */}
      {stage === 'preview' && parseResult && (
        <div className="flex flex-col gap-4">
          {/* Detection summary */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 16,
              padding: '20px 24px',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <span style={{ fontSize: 28 }}>{DATA_TYPE_ICONS[parseResult.detectedType]}</span>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>
                    Detected: {DATA_TYPE_LABELS[parseResult.detectedType]}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {fileName} · Sheet: {parseResult.sheetName}
                    {parseResult.bankFormat && (
                      <span>
                        {' '}· Format:{' '}
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          {parseResult.bankFormat.toUpperCase()}
                        </span>
                      </span>
                    )}
                    {parseResult.accountName && (
                      <span>
                        {' '}· Account:{' '}
                        <span style={{ color: 'var(--accent-cyan)' }}>{parseResult.accountName}</span>
                      </span>
                    )}
                    {' '}·{' '}
                    <span style={{ color: 'var(--accent-cyan)' }}>
                      {parseResult.totalParsed} rows ready
                    </span>
                    {parseResult.totalRaw - parseResult.totalParsed > 0 && (
                      <span style={{ color: '#fbbf24' }}>
                        {' '}
                        · {parseResult.totalRaw - parseResult.totalParsed} skipped (blank/unparseable)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  ← Change File
                </button>
                <button
                  onClick={handleCommit}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--accent-gradient)',
                    color: '#050505',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                  }}
                >
                  Import {parseResult.totalParsed} rows →
                </button>
              </div>
            </div>

            {/* Column mapping chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(parseResult.columnMap).map(([field, col]) => (
                <span
                  key={field}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(0,212,255,0.06)',
                    border: '1px solid rgba(0,212,255,0.2)',
                    fontSize: 11,
                    fontFamily: 'var(--font-geist-mono)',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{field}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>←</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>{col}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Preview table */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 16,
              overflow: 'hidden',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-geist-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Preview — first {Math.min(parseResult.rows.length, 20)} of {parseResult.rows.length} rows
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {PREVIEW_COLS[parseResult.detectedType].map((col) => (
                      <th
                        key={col.key}
                        style={{
                          padding: '10px 16px',
                          textAlign: 'left',
                          color: 'var(--text-muted)',
                          fontSize: 11,
                          fontFamily: 'var(--font-geist-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.rows.slice(0, 20).map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      }}
                    >
                      {PREVIEW_COLS[parseResult.detectedType].map((col) => {
                        const raw = row[col.key]
                        const display = col.format ? col.format(raw) : String(raw ?? '—')

                        // Special rendering for action badges
                        if (col.key === 'action' && raw) {
                          const colors = getActionColor(String(raw))
                          return (
                            <td key={col.key} style={{ padding: '10px 16px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: colors.bg,
                                  color: colors.color,
                                  border: `1px solid ${colors.border}`,
                                }}
                              >
                                {String(raw)}
                              </span>
                            </td>
                          )
                        }

                        // Special rendering for is_credit badge
                        if (col.key === 'is_credit') {
                          const isCredit = Boolean(raw)
                          return (
                            <td key={col.key} style={{ padding: '10px 16px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: isCredit ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                                  color: isCredit ? '#34d399' : '#ef4444',
                                  border: `1px solid ${isCredit ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                }}
                              >
                                {isCredit ? 'Credit' : 'Charge'}
                              </span>
                            </td>
                          )
                        }

                        return (
                          <td
                            key={col.key}
                            style={{
                              padding: '10px 16px',
                              color:
                                col.key === 'name'
                                  ? 'var(--text-primary)'
                                  : 'var(--text-secondary)',
                              whiteSpace: col.key === 'notes' ? 'normal' : 'nowrap',
                            }}
                          >
                            {display}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Committing spinner ── */}
      {stage === 'committing' && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: '60px 32px',
            backdropFilter: 'blur(20px)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: 6 }}>
            Importing to Supabase...
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {importMode === 'replace' ? 'Replacing existing data' : 'Merging with existing data'}
          </p>
        </div>
      )}

      {/* ── Done ── */}
      {stage === 'done' && commitResult && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(52,211,153,0.3)',
            borderRadius: 16,
            padding: '40px 32px',
            backdropFilter: 'blur(20px)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p
            style={{
              color: '#34d399',
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            Import Complete
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{commitResult.imported}</strong> rows
            imported to{' '}
            <code
              style={{
                fontFamily: 'var(--font-geist-mono)',
                background: 'rgba(0,212,255,0.08)',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {commitResult.dataType}
            </code>{' '}
            · mode: {commitResult.mode}
          </p>
          {commitResult.errors > 0 && (
            <p style={{ color: '#fbbf24', fontSize: 13, marginBottom: 8 }}>
              ⚠️ {commitResult.errors} rows failed — check console for details
            </p>
          )}
          {(commitResult.skipped ?? 0) > 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
              {commitResult.skipped} duplicate rows skipped (already in database)
            </p>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            The Financial dashboard will now load live data from Supabase.
          </p>

          <button
            onClick={reset}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              borderRadius: 8,
              border: '1px solid rgba(0,212,255,0.3)',
              background: 'rgba(0,212,255,0.06)',
              color: 'var(--accent-cyan)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Import Another File
          </button>
        </div>
      )}

      {/* ── What to upload guide ── */}
      {stage === 'idle' && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: '24px',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h3
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-geist-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 16,
            }}
          >
            What to upload
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: '💳',
                type: 'Debt Accounts',
                desc: 'HELOC Consolidation Plan, debt tracker, or any spreadsheet with account names, balances, and rates.',
                columns: ['Account Name', 'Balance', 'Rate / APR', 'Min Payment', 'Notes'],
                example: 'HELOC Consolidation Plan.xlsx',
              },
              {
                icon: '🔄',
                type: 'Subscriptions',
                desc: 'Monthly subscription list with service names, costs, and keep/cancel/review decisions.',
                columns: ['Service Name', 'Monthly Cost', 'Action', 'Category'],
                example: 'Subscription Audit.xlsx',
              },
              {
                icon: '📊',
                type: 'Budget Categories',
                desc: 'Annual spending by category with actual vs survival budget targets.',
                columns: ['Category', 'Monthly Actual', 'Annual Actual', 'Survival Budget'],
                example: 'Budget 2026.xlsx',
              },
              {
                icon: '🧾',
                type: 'Transactions',
                desc: 'Bank or credit card CSV exports. Auto-detects Chase, AmEx, BofA formats. Deduplicates on import.',
                columns: ['Date', 'Description/Merchant', 'Amount', 'Category (auto-assigned)'],
                example: 'Chase_Activity_2025.csv',
              },
            ].map(({ icon, type, desc, columns, example }) => (
              <div
                key={type}
                style={{
                  padding: '16px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>
                    {type}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                  {desc}
                </p>
                <div className="flex flex-col gap-1">
                  {columns.map((col) => (
                    <span
                      key={col}
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-geist-mono)',
                      }}
                    >
                      → {col}
                    </span>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-geist-mono)',
                    marginTop: 10,
                    opacity: 0.6,
                  }}
                >
                  e.g. {example}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
