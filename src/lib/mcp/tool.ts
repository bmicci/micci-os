// ───────────────────────────────────────────────────────────────────────────
// Micci OS tool contract — one definition per tool, shared by every Claude
// surface (the claude.ai connector today; the in-app chat next, see
// docs/MCP_LAYER_PROPOSAL.md). A tool is plain data + a handler, with no
// MCP or AI SDK types, so each surface adapts the same objects.
//
// Rules: tools read through getFinancialData() / lib/finance/* (never
// re-derive numbers), return compact markdown under CHARACTER_LIMIT, and
// only SELECT unless the tool is explicitly marked as a write.
// ───────────────────────────────────────────────────────────────────────────

import type * as z from 'zod/v4'
import { createServiceClient } from '@/lib/supabase/service'
import type { FinancialData } from '@/lib/financial-data'

export const CHARACTER_LIMIT = 25_000
export const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const

// A type alias (not an interface) so it stays assignable to MCP's CallToolResult index signature.
export type ToolResult = {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

/** Per-call context. `data()` is memoized so one call (or one MCP request) loads getFinancialData() once. */
export interface ToolContext {
  data: () => Promise<FinancialData>
}

type Schema = z.ZodObject
type Args<S extends Schema | undefined> = S extends Schema ? z.infer<S> : Record<string, never>

export interface MicciTool<S extends Schema | undefined = Schema | undefined> {
  name: string
  title: string
  description: string
  inputSchema?: S
  annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean }
  handler: (args: Args<S>, ctx: ToolContext) => Promise<ToolResult>
}

/** Type-checks a tool's handler against its own input schema, then erases it for the registry. */
export function defineTool<S extends Schema | undefined = undefined>(tool: MicciTool<S>): AnyMicciTool {
  return tool as unknown as AnyMicciTool
}

export interface AnyMicciTool extends Omit<MicciTool, 'inputSchema' | 'handler'> {
  inputSchema?: Schema
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>
}

export function createToolContext(load: () => Promise<FinancialData>): ToolContext {
  let dataPromise: Promise<FinancialData> | null = null
  return { data: () => (dataPromise ??= load()) }
}

// ── formatting ──────────────────────────────────────────────────────────────
export const usd = (n: number | null | undefined, cents = false) =>
  n == null || Number.isNaN(n) ? '—'
    : `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`
export const day = (iso: string | null | undefined) =>
  !iso ? '—' : new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
export const isoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())
export const isoDaysAgo = (n: number) => {
  const d = new Date(isoToday() + 'T00:00:00')
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
export const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] })
export const fail = (s: string) => ({ content: [{ type: 'text' as const, text: s }], isError: true })

export function db() {
  const service = createServiceClient()
  if (!service) throw new Error('Supabase is not configured on the server (missing SUPABASE_SERVICE_ROLE_KEY).')
  return service
}
