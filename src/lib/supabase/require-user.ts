import { createClient } from './server'

/**
 * Returns the signed-in user, or null.
 *
 * Route handlers that use the service client (RLS bypass) must call this
 * and 401 on null: without it, the session proxy in src/proxy.ts is the
 * ONLY thing between the public internet and financial data — a single
 * point of failure if the matcher ever regresses. Defense in depth.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
