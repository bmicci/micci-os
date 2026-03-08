'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const redirectTo = searchParams.get('redirectTo') ?? '/financial'
    if (!code) return

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('Sign in failed. Please try again.')
      } else {
        router.replace(redirectTo)
      }
    })
  }, [searchParams, router])

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // On success, browser redirects — no need to reset loading
  }

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
              Sign in to your personal OS.
            </p>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: '11px 20px',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 500,
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                marginBottom: 20,
                opacity: googleLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!googleLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            >
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Redirecting...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

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
