'use client'

// Plaid bank auto-sync card for the Import Center — connect institutions,
// see sync status, trigger a manual sync. Replaces the monthly CSV ritual
// for connected accounts (keep CSV import for anything not connected).

import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Landmark, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'

interface PlaidItem {
  id: string
  institution_name: string | null
  status: string
  last_synced_at: string | null
  last_error: string | null
  account_map: Record<string, string>
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function PlaidLinkButton({ linkToken, onSuccess }: {
  linkToken: string
  onSuccess: (publicToken: string, institutionName: string | null) => void
}) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      if (!publicToken) return
      onSuccess(publicToken, metadata.institution?.name ?? null)
    },
  })

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="text-[12px] font-semibold px-4 py-2 rounded-lg transition-all"
      style={{
        background: 'linear-gradient(135deg,#00d4ff,#1e90ff)',
        color: '#050505',
        opacity: ready ? 1 : 0.5,
        cursor: ready ? 'pointer' : 'wait',
        border: 'none',
      }}
    >
      Continue in Plaid →
    </button>
  )
}

export default function BankSyncCard() {
  const [items, setItems] = useState<PlaidItem[]>([])
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null) // 'connect' | 'sync' | item id
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/plaid/items')
      if (!res.ok) return
      const data = await res.json()
      setConfigured(data.configured)
      setItems(data.items)
    } catch { /* leave state as-is */ }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function startConnect() {
    setBusy('connect')
    setNotice(null)
    try {
      const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      setLinkToken(data.link_token)
    } catch (err) {
      setNotice(`⚠️ ${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  async function completeConnect(publicToken: string, institutionName: string | null) {
    setLinkToken(null)
    setBusy('connect')
    setNotice('Connecting and running first sync — this can take a minute…')
    try {
      const res = await fetch('/api/plaid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken, institution_name: institutionName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      setNotice(`✅ ${data.sync.institution}: ${data.sync.added} transactions imported`)
      await refresh()
    } catch (err) {
      setNotice(`⚠️ ${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  async function syncNow() {
    setBusy('sync')
    setNotice('Syncing all connected banks…')
    try {
      const res = await fetch('/api/plaid/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      const totals = (data.results as { added: number; modified: number; error?: string }[])
        .reduce((s, r) => ({ added: s.added + r.added, errors: s.errors + (r.error ? 1 : 0) }), { added: 0, errors: 0 })
      setNotice(`✅ Sync complete — ${totals.added} new transactions${totals.errors ? ` · ${totals.errors} institution(s) errored` : ''}`)
      await refresh()
    } catch (err) {
      setNotice(`⚠️ ${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  async function disconnect(id: string, name: string | null) {
    if (!window.confirm(`Disconnect ${name ?? 'this bank'}? Already-synced transactions are kept.`)) return
    setBusy(id)
    try {
      await fetch('/api/plaid/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Landmark size={15} strokeWidth={2} className="text-[var(--accent-cyan)]" />
          Bank Auto-Sync
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
            style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}>
            Plaid
          </span>
        </h3>
        {items.length > 0 && (
          <button
            onClick={syncNow}
            disabled={busy !== null}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            style={{
              background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)',
              border: '1px solid rgba(0,212,255,0.3)', cursor: busy ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={12} className={busy === 'sync' ? 'animate-spin' : ''} /> Sync now
          </button>
        )}
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: 'var(--text-muted)' }}>
        Connected accounts pull transactions automatically (daily + on demand) into the same
        table as CSV imports — burn, runway, and subscriptions stay current with zero exports.
        Once a bank is connected, stop CSV-importing that same account to avoid duplicates.
      </p>

      {configured === false && (
        <div className="rounded-lg p-3 text-[12px]"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
          <AlertTriangle size={13} className="inline mr-1.5 -mt-0.5" />
          Not configured yet. Create a (free) Plaid account at <strong>dashboard.plaid.com</strong>,
          then add <code>PLAID_CLIENT_ID</code>, <code>PLAID_SECRET</code>, and{' '}
          <code>PLAID_ENV=production</code> to Vercel environment variables and redeploy.
        </div>
      )}

      {configured && (
        <>
          {/* Connected institutions */}
          {items.map(item => (
            <div key={item.id}
              className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg mb-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.institution_name ?? 'Bank'}
                  <span className="ml-2 text-[10.5px] font-normal" style={{ color: 'var(--text-muted)' }}>
                    {Object.keys(item.account_map).length} account{Object.keys(item.account_map).length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="text-[10.5px]" style={{ color: item.last_error ? '#ef4444' : 'var(--text-muted)' }}>
                  {item.status === 'login_required'
                    ? '⚠️ Re-authentication needed — reconnect this bank'
                    : item.last_error
                      ? `⚠️ ${item.last_error.slice(0, 80)}`
                      : `Last synced ${timeAgo(item.last_synced_at)}`}
                </div>
              </div>
              <button
                onClick={() => disconnect(item.id, item.institution_name)}
                disabled={busy !== null}
                aria-label="Disconnect"
                className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {/* Connect flow */}
          <div className="mt-3">
            {linkToken ? (
              <PlaidLinkButton linkToken={linkToken} onSuccess={completeConnect} />
            ) : (
              <button
                onClick={startConnect}
                disabled={busy !== null}
                className="text-[12px] font-semibold px-4 py-2 rounded-lg"
                style={{
                  background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)',
                  border: '1px dashed rgba(0,212,255,0.4)', cursor: busy ? 'wait' : 'pointer',
                }}
              >
                + Connect a bank
              </button>
            )}
          </div>
        </>
      )}

      {notice && (
        <div className="mt-3 text-[11.5px] px-3 py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
          {notice}
        </div>
      )}
    </div>
  )
}
