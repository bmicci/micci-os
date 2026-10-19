// Single-owner access policy. micci-os holds one person's finances, and most
// API routes read through the service client (RLS bypass) after checking
// only that the caller is "signed in" — so signed in must mean:
//
//   1. SSO: authenticated through Google with an allowlisted account
//      (default: the brandonmicci.com Workspace account, which carries
//      Google's own 2-Step Verification), and
//   2. MFA: the session has passed a second factor (TOTP authenticator code)
//      — Supabase assurance level aal2.
//
// Anything less is treated as signed out (proxy) or 401 (API routes).
// Overrides (Vercel env): MICCI_ALLOWED_EMAILS="a@x.com,b@y.com".

import type { User } from '@supabase/supabase-js'

const DEFAULT_OWNER_EMAILS = ['brandon@brandonmicci.com']

export function ownerEmails(): string[] {
  const env = process.env.MICCI_ALLOWED_EMAILS
  const list = env ? env.split(',') : DEFAULT_OWNER_EMAILS
  return list.map(e => e.trim().toLowerCase()).filter(Boolean)
}

/** Allowlisted email that signed in through Google SSO. */
export function isOwner(user: Pick<User, 'email' | 'app_metadata'> | null | undefined): boolean {
  if (!user?.email || !ownerEmails().includes(user.email.toLowerCase())) return false
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider]
  return providers.includes('google')
}
