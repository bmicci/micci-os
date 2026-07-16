import { createServiceClient } from '@/lib/supabase/service'
import ActionHub from '@/components/tasks/ActionHub'
import type { ActionItem } from '@/lib/financial-data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Actions — Micci OS' }

// Unified action list — same action_items table the Financial Overview rail
// and the dashboard Today feed read. One list, every life area.

export default async function TasksPage() {
  const supabase = createServiceClient()
  let items: ActionItem[] = []

  if (supabase) {
    const { data } = await supabase
      .from('action_items')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })

    /* eslint-disable @typescript-eslint/no-explicit-any */
    items = ((data ?? []) as any[]).map(r => ({
      id: r.id,
      title: r.title,
      detail: r.detail ?? '',
      priority: (r.priority ?? 'amber') as ActionItem['priority'],
      dueDate: r.due_date ?? null,
      amount: r.amount != null ? Number(r.amount) : null,
      status: (r.status ?? 'active') as ActionItem['status'],
      completedAt: r.completed_at ?? null,
      category: (r.category ?? 'finance') as string,
    }))
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  const open = items.filter(i => (i.status ?? 'active') === 'active').length

  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-6 py-4"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
        }}
      >
        <h1 className="text-lg font-bold gradient-text">Action Center</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          One list, every life area · {open} open · synced with the Financial Overview and Command Center
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <ActionHub initialItems={items} />
      </div>
    </div>
  )
}
