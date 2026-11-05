// Columns a client may write (single-tenant table, deny-all RLS).
export const SCENARIO_FIELDS = ['name', 'is_baseline', 'paycheck_inputs', 'heloc_inputs', 'cashflow_inputs', 'notes'] as const

export function pickScenarioFields(body: unknown): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (!body || typeof body !== 'object') return row
  for (const f of SCENARIO_FIELDS) if (f in body) row[f] = (body as Record<string, unknown>)[f]
  return row
}
