import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware will handle session refresh
          }
        },
      },
    }
  )
}

// A TRUE service-role client — bypasses RLS regardless of who's logged in.
//
// createServerClient() (the @supabase/ssr cookie-based client used above)
// reads the caller's own session from cookies and, when a session exists,
// uses THAT user's access token for every query — not the key passed to
// the constructor. Handing it the service-role key only sets the apikey
// header; Postgres still evaluates RLS as the logged-in user. That went
// unnoticed because most tables have `user_id = auth.uid()` policies that
// happen to pass for the owner's own rows — it broke loudly on
// `plaid_items`, which is RLS-enabled with zero policies (tokens must
// only be reachable server-side) and has no such policy to coincidentally
// satisfy.
//
// createClient() from the base @supabase/supabase-js SDK has no cookie
// awareness, so it always authenticates as the key it was given.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
