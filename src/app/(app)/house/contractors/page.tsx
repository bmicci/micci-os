import { createClient } from '@/lib/supabase/server'
import ContractorsList from '@/components/house/ContractorsList'
import type { DbHouseContractor, DbHouseProject } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Contractors — House — Micci OS' }

export default async function HouseContractorsPage() {
  const supabase = await createClient()

  const [{ data: contractors }, { data: projects }] = await Promise.all([
    supabase.from('house_contractors').select('*').order('name'),
    supabase.from('house_projects').select('id, title, room').neq('status', 'cancelled').order('title'),
  ])

  return (
    <ContractorsList
      initialContractors={(contractors ?? []) as DbHouseContractor[]}
      projects={(projects ?? []) as Pick<DbHouseProject, 'id' | 'title' | 'room'>[]}
    />
  )
}
