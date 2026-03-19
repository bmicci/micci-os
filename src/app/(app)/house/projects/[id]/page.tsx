import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectDetail from '@/components/house/ProjectDetail'
import type {
  DbHouseProject, DbHouseProjectMilestone, DbHouseMaterial,
  DbHousePayment, DbHouseContractor,
} from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: project },
    { data: materials },
    { data: milestones },
    { data: payments },
    { data: contractors },
  ] = await Promise.all([
    supabase.from('house_projects').select('*').eq('id', id).single(),
    supabase.from('house_materials').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('house_project_milestones').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('house_payments').select('*').eq('project_id', id).order('payment_date', { ascending: false }),
    supabase.from('house_contractors').select('id, name, company, trade, phone, email').eq('is_active', true).order('name'),
  ])

  if (!project) notFound()

  return (
    <ProjectDetail
      project={project as DbHouseProject}
      initialMaterials={(materials ?? []) as DbHouseMaterial[]}
      initialMilestones={(milestones ?? []) as DbHouseProjectMilestone[]}
      initialPayments={(payments ?? []) as DbHousePayment[]}
      contractors={(contractors ?? []) as Pick<DbHouseContractor, 'id' | 'name' | 'company' | 'trade' | 'phone' | 'email'>[]}
    />
  )
}
