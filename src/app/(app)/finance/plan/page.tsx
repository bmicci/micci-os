import MasterPlanClient from '@/components/financial/masterPlan/MasterPlanClient'
import { Card } from '@/components/financial/calculators/ui'
import { getFinancialData } from '@/lib/financial-data-service'
import { parseMasterPlan, type LiveDebt } from '@/lib/finance/masterPlan'
import { requireOwnerPage } from '@/lib/supabase/require-user'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata = { title: 'Master Plan — Micci OS' }
export const dynamic = 'force-dynamic'

async function loadPlan() {
  try {
    const { data } = await createServiceClient()!.from('financial_settings').select('value').eq('key', 'strategic_plan').maybeSingle()
    const v = (data?.value ?? null) as Record<string, unknown> | null
    return { raw: v, plan: parseMasterPlan(v) }
  } catch {
    return { raw: null, plan: null }
  }
}

export default async function MasterPlanPage() {
  await requireOwnerPage()
  const [data, { raw, plan }] = await Promise.all([getFinancialData(), loadPlan()])
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  if (!plan) {
    return (
      <div className="px-4 py-6 md:px-6 max-w-6xl mx-auto pb-24 md:pb-6">
        <Card title="Master Plan" subtitle="The plan's month-by-month projection isn't loaded yet.">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The saved strategic plan is v{String(raw?.version ?? '?')}, which has no projection. Apply the latest
            <code className="mx-1">supabase/migrations/*_strategic_plan_v*.sql</code>
            migration to load the plan and the workbook&apos;s projection.
          </p>
        </Card>
      </div>
    )
  }

  const debts: LiveDebt[] = data.debts.map(d => ({
    name: d.name, balance: d.balance, category: d.category, payInFull: d.payInFull,
    source: d.source, asOf: d.asOf, stale: d.stale,
  }))

  return (
    <div className="px-4 py-6 md:px-6 max-w-6xl mx-auto pb-24 md:pb-6">
      <MasterPlanClient plan={plan} version={String(raw?.version ?? '')} asOf={String(raw?.as_of ?? plan.start.date)} debts={debts}
        cash={{ checking: data.assets.cash ?? null, savings: data.assets.savings ?? null }} today={today} />
    </div>
  )
}
