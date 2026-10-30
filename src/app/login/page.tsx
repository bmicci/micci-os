'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'not_authorized') {
      setError('That account is not authorized for this app.')
    }
  }, [searchParams])

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
        // Steer Google to the Workspace account (the server enforces the
        // allowlist; this just skips the account picker detour).
        queryParams: { hd: 'brandonmicci.com', prompt: 'select_account' },
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // On success, browser redirects — no need to reset loading
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
              background: 'var(--accent-gradient)',
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

            {error && (
              <p className="text-xs mb-3" style={{ color: '#ff6b6b' }}>
                {error}
              </p>
            )}

            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Single sign-on with the owner&apos;s Google Workspace account, then a code from your
              authenticator app.
            </p>
        </>
      </div>
    </div>
  )
}
