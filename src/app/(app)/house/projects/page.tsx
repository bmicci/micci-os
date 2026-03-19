import { createClient } from '@/lib/supabase/server'
import ProjectsKanban from '@/components/house/ProjectsKanban'
import type { DbHouseProject, DbHouseContractor } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Projects — House — Micci OS' }

export default async function HouseProjectsPage() {
  const supabase = await createClient()

  const [{ data: projects }, { data: contractors }] = await Promise.all([
    supabase.from('house_projects').select('*').order('sort_order').order('created_at', { ascending: false }),
    supabase.from('house_contractors').select('id, name, company').eq('is_active', true).order('name'),
  ])

  return (
    <ProjectsKanban
      initialProjects={(projects ?? []) as DbHouseProject[]}
      contractors={(contractors ?? []) as Pick<DbHouseContractor, 'id' | 'name' | 'company'>[]}
    />
  )
}
