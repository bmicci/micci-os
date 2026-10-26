/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Insert-or-update one body_metrics row keyed by (source, external_id).
 * The unique index is partial (WHERE external_id IS NOT NULL), which
 * PostgREST's ON CONFLICT can't target — so look it up first.
 */
export async function upsertBodyMetric(service: any, row: Record<string, unknown> & { source: string; external_id: string }) {
  const { data: existing } = await service.from('body_metrics')
    .select('id').eq('source', row.source).eq('external_id', row.external_id).limit(1)
  if (existing && existing.length) {
    return service.from('body_metrics').update(row).eq('id', existing[0].id)
  }
  return service.from('body_metrics').insert(row)
}
