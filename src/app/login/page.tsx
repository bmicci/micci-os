'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Animated grid background */}
      <div className="animated-grid" />

      <div
        className="relative z-10 glass-card p-10 w-full max-w-md"
        style={{ borderRadius: 24 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg,#00d4ff,#1e90ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: '#050505',
              flexShrink: 0,
            }}
          >
            M
          </div>
          <span
            className="gradient-text font-semibold text-lg tracking-wide"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            micci-os
          </span>
        </div>

        {sent ? (
          <div className="text-center">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                margin: '0 auto 20px',
              }}
            >
              ✉️
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Check your email
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              We sent a magic link to{' '}
              <span style={{ color: 'var(--accent-cyan)' }}>{email}</span>.
              <br />
              Click the link to sign in.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-6 text-sm"
              style={{ color: 'var(--text-muted)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Welcome back
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
              Enter your email to receive a magic link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="brandon@example.com"
                  required
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(0,212,255,0.2)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(0,212,255,0.6)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(0,212,255,0.2)')}
                />
              </div>

              {error && (
                <p className="text-xs" style={{ color: '#ff6b6b' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading
                    ? 'rgba(0,212,255,0.2)'
                    : 'linear-gradient(135deg,#00d4ff,#1e90ff)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '11px 20px',
                  color: loading ? 'var(--text-muted)' : '#050505',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  marginTop: 4,
                }}
              >
                {loading ? 'Sending...' : 'Send magic link →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
