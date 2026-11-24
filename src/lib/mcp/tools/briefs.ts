// Briefs tool: latest Micci Daily editions written by the scheduled routines.

import * as z from 'zod/v4'
import { BRIEF_TABS, type BriefBlock } from '@/lib/briefs'
import { CHARACTER_LIMIT, READ_ONLY, db, defineTool, fail, text, type AnyMicciTool } from '../tool'

function renderBlock(b: BriefBlock): string {
  const title = 'title' in b && b.title ? `### ${b.title}\n` : ''
  switch (b.type) {
    case 'kpis': return title + (b.items ?? []).map(i => `- ${i.label}: **${i.value}**${i.delta ? ` (${i.delta})` : ''}`).join('\n')
    case 'list': return title + (b.items ?? []).map(i => `- **${i.title}**${i.detail ? ` — ${i.detail}` : ''}${i.link ? ` (${i.link})` : ''}`).join('\n')
    case 'table': return title + [`| ${b.columns.join(' | ')} |`, `|${b.columns.map(() => '---').join('|')}|`, ...b.rows.map(r => `| ${r.join(' | ')} |`)].join('\n')
    case 'decision': return title + `**${b.question}**\n${b.recommendation}${b.context ? `\n_${b.context}_` : ''}`
    case 'text': return title + b.body
    case 'drafts': return title + (b.items ?? []).map(d => `- **${d.action}** → ${d.to || d.to_note || 'no recipient'}: "${d.subject}"`).join('\n')
    default: return ''
  }
}

export const briefsTools: AnyMicciTool[] = [
  defineTool({
    name: 'micci_briefs',
    title: 'Daily briefs',
    description:
      "Brandon's Micci Daily briefs (written by scheduled routines): money (bills due, big charges, cash), ai (AI news), health, home (claims, bills, renewals). The markets pre-market brief lives in its own table and is not returned here. Omit tab for the latest headline of every tab; pass a tab for the full latest edition (or a specific date).",
    inputSchema: z.strictObject({
      tab: z.enum(BRIEF_TABS.map(t => t.id) as [string, ...string[]]).optional().describe('Which brief; omit for all headlines'),
      date: z.iso.date().optional().describe('Edition date YYYY-MM-DD (default: latest)'),
    }),
    annotations: READ_ONLY,
    handler: async (a) => {
      if (!a.tab) {
        const { data: rows, error } = await db().from('briefs')
          .select('tab, doc_key, brief_date, headline').gte('brief_date', '2026-01-01')
          .order('brief_date', { ascending: false }).limit(60)
        if (error) return fail(`Query failed: ${error.message}`)
        const latest = new Map<string, { doc_key: string; headline: string | null }>()
        for (const r of rows ?? []) if (!latest.has(r.tab)) latest.set(r.tab, r)
        return text(['# Latest briefs', ...BRIEF_TABS.map(t => {
          const r = latest.get(t.id)
          return `- **${t.label}** (${r ? r.doc_key : 'none yet'}): ${r?.headline ?? '—'}`
        }), '', 'Call again with tab=<id> for the full edition.'].join('\n'))
      }
      let q = db().from('briefs').select('*').eq('tab', a.tab)
      q = a.date ? q.eq('brief_date', a.date) : q.gte('brief_date', '2026-01-01')
      const { data: rows, error } = await q.order('brief_date', { ascending: false }).order('doc_key', { ascending: false }).limit(1)
      if (error) return fail(`Query failed: ${error.message}`)
      const b = rows?.[0]
      if (!b) return text(`No ${a.tab} brief${a.date ? ` for ${a.date}` : ''} yet.`)
      const body = ((b.blocks ?? []) as BriefBlock[]).map(renderBlock).join('\n\n')
      return text([`# ${a.tab} brief — ${b.doc_key}${b.period_label ? ` (${b.period_label})` : ''}`, b.headline ?? '', '', body].join('\n').slice(0, CHARACTER_LIMIT))
    },
  }),
]
