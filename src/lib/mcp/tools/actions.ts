// Action Center tool: open to-dos plus upcoming bills and promo deadlines.

import * as z from 'zod/v4'
import { daysUntil, dueLabel, isOverdue } from '@/lib/finance/due'
import { CHARACTER_LIMIT, READ_ONLY, day, defineTool, text, usd, type AnyMicciTool } from '../tool'


export const actionsTools: AnyMicciTool[] = [
  defineTool({
    name: 'micci_action_items',
    title: 'Open action items & deadlines',
    description:
      "Brandon's open to-dos from the micci-os Action Center (finance, HELOC, tax, legal, job search, health) with due dates and amounts, plus upcoming bills and promo expirations. Use for 'what should I do before I start the new job', prioritization and deadline questions.",
    inputSchema: z.strictObject({
      category: z.string().max(40).optional().describe("Filter by life area, e.g. 'finance', 'tax', 'job_search', 'health'"),
    }),
    annotations: READ_ONLY,
    handler: async (a, ctx) => {
      const d = await ctx.data()
      const open = d.actionItems
        .filter(i => (i.status ?? 'active') === 'active' && (!a.category || i.category === a.category))
        .sort((x, y) => (x.dueDate ?? '9999').localeCompare(y.dueDate ?? '9999'))
      // Past-due items lead, marked OVERDUE — never presented as "next up".
      const overdue = open.filter(i => isOverdue(i.dueDate))
      const rest = open.filter(i => !isOverdue(i.dueDate))
      const line = (i: (typeof open)[number]) =>
        `- [${i.priority}] **${i.title}**${i.dueDate ? ` — due ${day(i.dueDate)}${isOverdue(i.dueDate) ? ` (**OVERDUE ${-daysUntil(i.dueDate)}d**)` : ''}` : ''}${i.amount != null ? ` · ${usd(i.amount)}` : ''}${i.category ? ` · ${i.category}` : ''}${i.detail ? `\n  ${i.detail}` : ''}`
      return text([
        `# Open action items (${open.length}${overdue.length ? `, ${overdue.length} overdue` : ''})`,
        ...(overdue.length ? ['', `## Overdue (${overdue.length}) — past due; confirm done or reschedule`, ...overdue.map(line), '', '## Open'] : []),
        ...rest.map(line),
        '',
        '## Upcoming bills & deadlines',
        ...(d.upcoming.length ? d.upcoming.map(u => `- ${day(u.date)} (${u.daysAway < 0 ? `**${dueLabel(u.daysAway)}**` : dueLabel(u.daysAway)}) · ${u.kind}: ${u.label}${u.amount != null ? ` · ${usd(u.amount)}` : ''}${u.detail ? ` — ${u.detail}` : ''}`) : ['- None']),
      ].join('\n').slice(0, CHARACTER_LIMIT))
    },
  }),
]
