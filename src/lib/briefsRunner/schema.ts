// What the model must return for each brief. Validated before anything is
// written; a reply that doesn't match is a failed run and writes nothing.

import * as z from 'zod/v4'

const tone = z.enum(['good', 'warn', 'crit', 'accent']).optional()
const s = z.string().max(600)

export const BriefBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('kpis'), title: s.optional(), wide: z.boolean().optional(),
    items: z.array(z.object({ label: s, value: s, delta: s.optional(), tone })).max(8) }),
  z.object({ type: z.literal('list'), title: s, wide: z.boolean().optional(),
    items: z.array(z.object({ title: s, detail: z.string().max(1200).optional(), link: z.url().optional(), link_label: s.optional(), tone })).max(12) }),
  z.object({ type: z.literal('table'), title: s, wide: z.boolean().optional(),
    columns: z.array(s).max(6), rows: z.array(z.array(s).max(6)).max(15) }),
  z.object({ type: z.literal('decision'), title: s, wide: z.boolean().optional(),
    question: s, recommendation: z.string().max(1200), context: z.string().max(1200).optional() }),
  z.object({ type: z.literal('text'), title: s, wide: z.boolean().optional(), body: z.string().max(2000) }),
])

export const BriefDocSchema = z.object({
  headline: z.string().min(1).max(300),
  period_label: s.optional(),
  chips: z.array(z.string().max(60)).max(6).optional(),
  blocks: z.array(BriefBlockSchema).min(1).max(8),
})
export type BriefDoc = z.infer<typeof BriefDocSchema>

export const MarketsDocSchema = z.object({
  title: z.string().min(1).max(200),
  body_md: z.string().min(1).max(6000),
  highlights: z.array(z.string().max(300)).max(6),
  action_bias: z.enum(['hold', 'watch', 'trim', 'add']),
  sources: z.array(z.object({ label: z.string().max(200), url: z.url() })).max(10),
})
export type MarketsDoc = z.infer<typeof MarketsDocSchema>

/** Pulls the JSON object out of a model reply (bare, or inside a ```json fence). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = (fenced ? fenced[1] : text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('no JSON object in the reply')
  return JSON.parse(raw.slice(start, end + 1))
}
