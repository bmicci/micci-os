import { createClient } from '@supabase/supabase-js'

// Server-only service role client — bypasses RLS
// NEVER import this from client components
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return null // triggers hardcoded fallback in data service
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
