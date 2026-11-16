import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from './server'
import { isOwner } from '@/lib/auth/owner'

/**
 * The signed-in user from `client`'s session — but only if it is the owner,
 * signed in via Google SSO, with a verified second factor (aal2). Anyone
 * else comes back as `user: null`. Same shape as `auth.getUser()` so routes
 * can swap it in directly.
 */
export async function verifiedOwner(client: SupabaseClient) {
  const { data: { user } } = await client.auth.getUser()
  if (!user || !isOwner(user)) return { data: { user: null } }
  const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
  return { data: { user: aal?.currentLevel === 'aal2' ? user : null } }
}

/**
 * Returns the signed-in owner, or null.
 *
 * Route handlers that use the service client (RLS bypass) must call this
 * and 401 on null: without it, the session proxy in src/proxy.ts is the
 * ONLY thing between the public internet and financial data — a single
 * point of failure if the matcher ever regresses. Defense in depth.
 * Only the owner, via Google SSO, with a second factor (aal2) counts as
 * signed in — see lib/auth/owner.ts.
 */
export async function requireUser() {
  const { data: { user } } = await verifiedOwner(await createClient())
  return user
}

/**
 * Page-level gate: call first in every server page under `(app)`.
 *
 * Pages read through the service client (RLS bypass), so they must not rely
 * on src/proxy.ts alone — a proxy/middleware bypass would otherwise render
 * financial data to an anonymous request. Layouts are not a safe place for
 * this check (a page can render without its layout re-running), so each
 * page calls it itself. tests/auth/pages.test.ts enforces that.
 */
export async function requireOwnerPage() {
  const user = await requireUser()
  if (!user) redirect('/login')
  return user
}
