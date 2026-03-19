import { createClient } from '@/lib/supabase/server'
import HouseDashboard from '@/components/house/HouseDashboard'
import type { DbHouseProject, DbHouseMaterial, DbHousePayment } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'House — Micci OS' }

export default async function HousePage() {
  const supabase = await createClient()

  const [{ data: projects }, { data: materials }, { data: payments }] = await Promise.all([
    supabase.from('house_projects').select('*').order('sort_order').order('created_at', { ascending: false }),
    supabase.from('house_materials').select('project_id, total_cost, order_status, vendor'),
    supabase.from('house_payments').select('project_id, amount, payment_date'),
  ])

  return (
    <HouseDashboard
      initialProjects={(projects ?? []) as DbHouseProject[]}
      initialMaterials={(materials ?? []) as Partial<DbHouseMaterial>[]}
      initialPayments={(payments ?? []) as Partial<DbHousePayment>[]}
    />
  )
}
