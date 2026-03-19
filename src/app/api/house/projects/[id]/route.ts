import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const [{ data: project }, { data: materials }, { data: milestones }, { data: payments }, { data: bids }] = await Promise.all([
    supabase.from('house_projects').select('*').eq('id', id).single(),
    supabase.from('house_materials').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('house_project_milestones').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('house_payments').select('*').eq('project_id', id).order('payment_date', { ascending: false }),
    supabase.from('house_contractor_bids').select('*, house_contractors(name, company, trade)').eq('project_id', id),
  ])

  return NextResponse.json({ project, materials, milestones, payments, bids })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await req.json()

  const { data, error } = await supabase
    .from('house_projects')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { error } = await supabase.from('house_projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
