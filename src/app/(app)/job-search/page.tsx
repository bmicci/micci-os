import { redirect } from 'next/navigation'
import { requireOwnerPage } from '@/lib/supabase/require-user'

// Job search lives at /pipeline (target companies, contacts, daily log).
// The older tabbed tracker that was here read the `job_*` tables, last
// touched in July 2026; those tables and /api/job-search are left in place
// so nothing is lost. Keep old links and bookmarks working.
export default async function JobSearchRedirect() {
  await requireOwnerPage()
  redirect('/pipeline')
}
