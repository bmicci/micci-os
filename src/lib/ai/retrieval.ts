import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from './embeddings'

export type Section = 'financial' | 'goals' | 'planner' | 'health' | 'general'

export interface RetrievedChunk {
  id: string
  document_id: string
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

export async function retrieveRelevantChunks(
  query: string,
  section?: Section,
  matchCount = 8,
  matchThreshold = 0.5
): Promise<RetrievedChunk[]> {
  const supabase = await createClient()
  const queryEmbedding = await generateEmbedding(query)

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_section: section ?? null,
  })

  if (error) {
    console.error('Error retrieving chunks:', error)
    return []
  }

  return data ?? []
}

export async function getStructuredContext(section: Section): Promise<string> {
  const supabase = await createClient()
  let context = ''

  if (section === 'financial') {
    const [modules, subs, debts, budgets] = await Promise.all([
      supabase.from('financial_modules').select('*').order('name'),
      supabase.from('subscriptions').select('*').order('amount', { ascending: false }),
      supabase.from('debt_accounts').select('*').order('balance', { ascending: false }),
      supabase.from('budget_categories').select('*').order('name'),
    ])

    if (debts.data?.length) {
      const totalDebt = debts.data.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
      context += `\n## Debt Accounts (Total: $${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })})\n${JSON.stringify(debts.data, null, 2)}`
    }
    if (subs.data?.length) {
      const monthlyTotal = subs.data.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
      context += `\n## Subscriptions (Monthly total: ~$${monthlyTotal.toFixed(2)})\n${JSON.stringify(subs.data, null, 2)}`
    }
    if (budgets.data?.length) {
      context += `\n## Budget Categories\n${JSON.stringify(budgets.data, null, 2)}`
    }
    if (modules.data?.length) {
      context += `\n## Financial Modules\n${JSON.stringify(modules.data, null, 2)}`
    }
  }

  if (section === 'goals') {
    const [categories, goals] = await Promise.all([
      supabase.from('goal_categories').select('*'),
      supabase
        .from('goals')
        .select('*, goal_categories(name, icon, color)')
        .in('status', ['active', 'completed'])
        .order('priority')
        .limit(100),
    ])

    if (categories.data?.length) {
      context += `\n## Goal Categories\n${JSON.stringify(categories.data, null, 2)}`
    }
    if (goals.data?.length) {
      context += `\n## Goals\n${JSON.stringify(goals.data, null, 2)}`
    }
  }

  if (section === 'health') {
    const [supps, hormones, schedule] = await Promise.all([
      supabase.from('supplements').select('*').eq('is_active', true).order('category'),
      supabase.from('hormone_protocols').select('*').eq('is_active', true),
      supabase.from('daily_schedule').select('*').order('time_slot'),
    ])

    if (supps.data?.length) {
      context += `\n## Active Supplements\n${JSON.stringify(supps.data, null, 2)}`
    }
    if (hormones.data?.length) {
      context += `\n## Hormone Protocols (TRT)\n${JSON.stringify(hormones.data, null, 2)}`
    }
    if (schedule.data?.length) {
      context += `\n## Daily Schedule Template\n${JSON.stringify(schedule.data, null, 2)}`
    }
  }

  if (section === 'planner') {
    const { data: schedule } = await supabase
      .from('daily_schedule')
      .select('*')
      .order('time_slot')

    if (schedule?.length) {
      context += `\n## Daily Schedule\n${JSON.stringify(schedule, null, 2)}`
    }
  }

  return context
}
