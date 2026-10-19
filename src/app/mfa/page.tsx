'use client'

// Second factor (TOTP). The proxy sends the owner here after Google SSO until
// the session reaches aal2. First visit enrolls an authenticator app (QR);
// later visits just ask for the 6-digit code.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'loading' | 'enroll' | 'verify' | 'error'

function safeRedirect(): string {
  const target = new URLSearchParams(window.location.search).get('redirectTo') || '/financial'
  return target.startsWith('/') && !target.startsWith('//') ? target : '/financial'
}

export default function MfaPage() {
  const [mode, setMode] = useState<Mode>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) { setError(error.message); setMode('error'); return }
      const verified = data.totp.find(f => f.status === 'verified')
      if (verified) { setFactorId(verified.id); setMode('verify'); return }

      // No authenticator yet: clear abandoned enrollments, then start one.
      for (const f of data.all.filter(f => f.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data: enrolled, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp', friendlyName: `micci-os ${new Date().toISOString().slice(0, 10)}`,
      })
      if (enrollErr || !enrolled) { setError(enrollErr?.message ?? 'Could not start enrollment'); setMode('error'); return }
      setFactorId(enrolled.id)
      setQr(enrolled.totp.qr_code)
      setSecret(enrolled.totp.secret)
      setMode('enroll')
    })()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || code.length !== 6) return
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code })
    if (error) {
      setError('That code did not match. Check the time on your phone and try the newest code.')
      setCode('')
      setBusy(false)
      return
    }
    // Full navigation so the proxy sees the upgraded (aal2) session cookie.
    window.location.assign(safeRedirect())
  }

  async function signOut() {
    await createClient().auth.signOut()
    window.location.assign('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="animated-grid" />
      <div className="relative z-10 glass-card p-10 w-full max-w-md" style={{ borderRadius: 24 }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {mode === 'enroll' ? 'Set up two-factor' : 'Two-factor check'}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {mode === 'enroll'
            ? 'Scan this with your authenticator app (1Password, Google Authenticator, Authy), then enter the 6-digit code it shows.'
            : 'Enter the 6-digit code from your authenticator app.'}
        </p>

        {mode === 'loading' && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>}

        {mode === 'enroll' && qr && (
          <div className="mb-5 flex flex-col items-center gap-3">
            {/* Supabase returns the QR as an SVG data URI */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Authenticator QR code" width={180} height={180}
              style={{ background: '#fff', borderRadius: 12, padding: 8 }} />
            {secret && (
              <p className="text-[11px] text-center break-all" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono)' }}>
                Can&apos;t scan? Enter this key: {secret}
              </p>
            )}
          </div>
        )}

        {(mode === 'enroll' || mode === 'verify') && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <input
              aria-label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8,
                padding: '12px 14px', color: 'var(--text-primary)', fontSize: 22, letterSpacing: '0.4em',
                textAlign: 'center', fontFamily: 'var(--font-geist-mono)', outline: 'none', width: '100%',
              }}
            />
            <button type="submit" disabled={busy || code.length !== 6}
              style={{
                background: busy || code.length !== 6 ? 'rgba(0,212,255,0.2)' : 'linear-gradient(135deg,#00d4ff,#1e90ff)',
                border: 'none', borderRadius: 8, padding: '11px 20px', fontSize: 14, fontWeight: 600,
                color: busy || code.length !== 6 ? 'var(--text-muted)' : '#050505',
                cursor: busy || code.length !== 6 ? 'not-allowed' : 'pointer',
              }}>
              {busy ? 'Verifying…' : 'Verify →'}
            </button>
          </form>
        )}

        {error && <p className="text-xs mt-4" style={{ color: '#ff6b6b' }}>{error}</p>}

        <button onClick={signOut} className="mt-6 text-xs"
          style={{ color: 'var(--text-muted)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
