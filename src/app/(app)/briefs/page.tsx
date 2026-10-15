import { createServiceClient } from '@/lib/supabase/service'
import BriefsHub from '@/components/briefs/BriefsHub'
import {
  BRIEF_TABS, isBriefTab,
  type BriefConfig, type BriefEdition, type BriefRow, type BriefTab, type BriefTweak,
} from '@/lib/briefs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Briefs — Micci OS' }

// The briefs tables are deny-all (RLS, no policies) like the other
// single-tenant pipeline tables — read through the server-side service client.
// The (app) layout's session proxy gates this page.
export default async function BriefsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; d?: string }>
}) {
  const params = await searchParams
  const tab: BriefTab = isBriefTab(params.tab) ? params.tab : 'today'

  const service = createServiceClient()
  let editions: BriefEdition[] = []
  let brief: BriefRow | null = null
  let config: BriefConfig | null = null
  let tweaks: BriefTweak[] = []
  const latestByTab: Partial<Record<BriefTab, string>> = {}

  if (service) {
    const [editionsRes, latestRes, configRes, tweaksRes] = await Promise.all([
      service.from('briefs')
        .select('doc_key, brief_date, headline, period_label')
        .eq('tab', tab)
        .order('brief_date', { ascending: false })
        .order('doc_key', { ascending: false })
        .limit(90),
      // Newest edition date per tab, for the "new today" dots on the tab bar
      service.from('briefs')
        .select('tab, brief_date')
        .order('brief_date', { ascending: false })
        .limit(60),
      service.from('brief_config').select('tab, text, updated_at').eq('tab', tab).maybeSingle(),
      service.from('brief_tweaks')
        .select('id, tab, edition, section, kind, text, status, created_at')
        .eq('tab', tab)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    editions = (editionsRes.data ?? []) as BriefEdition[]
    for (const r of latestRes.data ?? []) {
      const t = r.tab as BriefTab
      if (!latestByTab[t]) latestByTab[t] = r.brief_date as string
    }
    config = (configRes.data as BriefConfig | null) ?? null
    tweaks = (tweaksRes.data ?? []) as BriefTweak[]

    const docKey = params.d && editions.some(e => e.doc_key === params.d)
      ? params.d
      : editions[0]?.doc_key
    if (docKey) {
      const { data } = await service.from('briefs')
        .select('*')
        .eq('tab', tab)
        .eq('doc_key', docKey)
        .maybeSingle()
      brief = (data as BriefRow | null) ?? null
    }
  }

  const tabMeta = BRIEF_TABS.find(t => t.id === tab)!

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-10 pt-8 pb-4 shrink-0">
        <h1 className="text-3xl font-bold gradient-text mb-1">Briefs</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Micci Daily · written by your scheduled Routines
        </p>
      </div>

      <BriefsHub
        tab={tab}
        schedule={tabMeta.schedule}
        editions={editions}
        brief={brief}
        config={config}
        tweaks={tweaks}
        latestByTab={latestByTab}
        connected={service != null}
      />
    </div>
  )
}
