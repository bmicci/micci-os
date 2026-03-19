import { createClient } from '@/lib/supabase/server'
import MaterialsTracker from '@/components/house/MaterialsTracker'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Materials — House — Micci OS' }

export default async function HouseMaterialsPage() {
  const supabase = await createClient()

  const [{ data: materials }, { data: projects }] = await Promise.all([
    supabase
      .from('house_materials')
      .select('*, house_projects(title, room)')
      .order('vendor')
      .order('sort_order'),
    supabase.from('house_projects').select('id, title, room').neq('status', 'cancelled').order('title'),
  ])

  return (
    <MaterialsTracker
      initialMaterials={materials ?? []}
      projects={projects ?? []}
    />
  )
}
