// Nov 2026 audit: server pages read through the service client (RLS bypass),
// so each one must check the owner itself instead of trusting src/proxy.ts
// alone. This walks every page under (app) and fails when one forgets.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const redirect = vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`) })
vi.mock('next/navigation', () => ({ redirect }))

let user: { email: string; app_metadata: Record<string, unknown> } | null
let aal: 'aal1' | 'aal2'
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user } }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: aal } }) },
    },
  }),
}))

const { requireOwnerPage } = await import('@/lib/supabase/require-user')
const { safeRedirectPath } = await import('@/lib/auth/redirect')

const OWNER = { email: 'brandon@brandonmicci.com', app_metadata: { provider: 'google', providers: ['google'] } }

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return pages(p)
    return name === 'page.tsx' ? [p] : []
  })
}

beforeEach(() => {
  user = null
  aal = 'aal1'
  redirect.mockClear()
  delete process.env.MICCI_ALLOWED_EMAILS
})

describe('requireOwnerPage', () => {
  it('sends an anonymous request to /login', async () => {
    await expect(requireOwnerPage()).rejects.toThrow('REDIRECT:/login')
  })
  it('sends a signed-in non-owner to /login', async () => {
    user = { email: 'someone@gmail.com', app_metadata: OWNER.app_metadata }
    aal = 'aal2'
    await expect(requireOwnerPage()).rejects.toThrow('REDIRECT:/login')
  })
  it('sends the owner without a second factor to /login', async () => {
    user = OWNER
    await expect(requireOwnerPage()).rejects.toThrow('REDIRECT:/login')
  })
  it('lets the owner with a second factor through', async () => {
    user = OWNER
    aal = 'aal2'
    await expect(requireOwnerPage()).resolves.toMatchObject({ email: OWNER.email })
    expect(redirect).not.toHaveBeenCalled()
  })
})

describe('every server page under (app)', () => {
  const all = pages(join(process.cwd(), 'src/app/(app)'))
  it('finds the pages', () => expect(all.length).toBeGreaterThan(20))
  for (const file of all) {
    const src = readFileSync(file, 'utf8')
    // Client pages render no data on the server; their API routes check.
    if (/^['"]use client['"]/m.test(src)) continue
    it(`${file.split('(app)')[1]} checks the owner before anything else`, () => {
      const body = src.slice(src.indexOf('export default'))
      const firstStatement = body.slice(body.indexOf('{\n', body.indexOf(') {') >= 0 ? body.indexOf(') {') : 0) + 2).trimStart()
      expect(firstStatement.startsWith('await requireOwnerPage()')).toBe(true)
    })
  }
})

describe('safeRedirectPath', () => {
  it('keeps same-site paths', () => {
    expect(safeRedirectPath('/financial?tab=debt')).toBe('/financial?tab=debt')
  })
  it('rejects anything that could leave the site', () => {
    for (const bad of ['//evil.com', '/\\evil.com', '/\t/evil.com', 'https://evil.com', '@evil.com', '', null]) {
      expect(safeRedirectPath(bad)).toBe('/financial')
    }
  })
})
