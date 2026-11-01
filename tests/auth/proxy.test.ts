// #32 · SSO + MFA (PR #30): owner-only via Google, second factor required,
// APIs 401 `mfa_required` before the code. Supabase auth is stubbed per case.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

interface Session { user: { email: string; app_metadata: Record<string, unknown> } | null; aal: 'aal1' | 'aal2' }
let session: Session
const signOut = vi.fn(async () => ({ error: null }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: session.user } }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: session.aal } }) },
      signOut,
    },
  }),
}))

const { proxy } = await import('@/proxy')
const { isOwner } = await import('@/lib/auth/owner')

const google = { provider: 'google', providers: ['google'] }
const OWNER = { email: 'brandon@brandonmicci.com', app_metadata: google }
const req = (path: string, method = 'GET') => new NextRequest(`https://os.brandonmicci.com${path}`, { method })

beforeEach(() => {
  session = { user: null, aal: 'aal1' }
  signOut.mockClear()
  delete process.env.MICCI_ALLOWED_EMAILS
})

describe('isOwner', () => {
  it('requires the allowlisted email via Google', () => {
    expect(isOwner(OWNER)).toBe(true)
    expect(isOwner({ ...OWNER, email: 'Brandon@BrandonMicci.com' })).toBe(true)
    expect(isOwner({ ...OWNER, app_metadata: { provider: 'email', providers: ['email'] } })).toBe(false)
    expect(isOwner({ email: 'someone@gmail.com', app_metadata: google })).toBe(false)
    expect(isOwner(null)).toBe(false)
  })

  it('honours MICCI_ALLOWED_EMAILS', () => {
    process.env.MICCI_ALLOWED_EMAILS = ' brandon.micci@gmail.com , other@x.com'
    expect(isOwner({ email: 'brandon.micci@gmail.com', app_metadata: google })).toBe(true)
    expect(isOwner(OWNER)).toBe(false)
  })
})

describe('proxy', () => {
  it('signed out: pages redirect to /login, APIs 401', async () => {
    const page = await proxy(req('/financial'))
    expect(page.status).toBe(307)
    expect(page.headers.get('location')).toBe('https://os.brandonmicci.com/login?redirectTo=%2Ffinancial')
    const api = await proxy(req('/api/debts'))
    expect(api.status).toBe(401)
    expect(await api.json()).toEqual({ error: 'Unauthorized' })
  })

  it('owner before the authenticator code: APIs 401 mfa_required, pages go to /mfa', async () => {
    session = { user: OWNER, aal: 'aal1' }
    const api = await proxy(req('/api/health/checkin', 'POST'))
    expect(api.status).toBe(401)
    expect(await api.json()).toEqual({ error: 'mfa_required' })
    const page = await proxy(req('/financial'))
    expect(page.headers.get('location')).toBe('https://os.brandonmicci.com/mfa?redirectTo=%2Ffinancial')
    expect((await proxy(req('/mfa'))).headers.get('location')).toBeNull()
    expect((await proxy(req('/login'))).headers.get('location')).toBe('https://os.brandonmicci.com/mfa')
  })

  it('owner after the code: passes through, and /login or /mfa bounce back', async () => {
    session = { user: OWNER, aal: 'aal2' }
    expect((await proxy(req('/api/debts'))).headers.get('x-middleware-next')).toBe('1')
    expect((await proxy(req('/mfa?redirectTo=/health'))).headers.get('location')).toBe('https://os.brandonmicci.com/health')
    // open-redirect guard
    expect((await proxy(req('/login?redirectTo=//evil.com'))).headers.get('location')).toBe('https://os.brandonmicci.com/financial')
  })

  it('a non-owner session is signed out and refused', async () => {
    session = { user: { email: 'someone@gmail.com', app_metadata: google }, aal: 'aal2' }
    const api = await proxy(req('/api/debts'))
    expect(api.status).toBe(403)
    expect(signOut).toHaveBeenCalledOnce()
    const page = await proxy(req('/financial'))
    expect(page.headers.get('location')).toBe('https://os.brandonmicci.com/login?error=not_authorized')
  })

  it('a password (non-Google) session for the owner email is refused', async () => {
    session = { user: { ...OWNER, app_metadata: { provider: 'email', providers: ['email'] } }, aal: 'aal2' }
    expect((await proxy(req('/api/debts'))).status).toBe(403)
  })

  it('machine endpoints stay reachable without a session (they check their own secret)', async () => {
    for (const path of ['/api/plaid/sync', '/api/investments/refresh-prices', '/api/mcp/some-secret']) {
      expect((await proxy(req(path))).headers.get('x-middleware-next')).toBe('1')
    }
    // ...but the POST (manual sync from the app) is gated
    expect((await proxy(req('/api/plaid/sync', 'POST'))).status).toBe(401)
  })
})
