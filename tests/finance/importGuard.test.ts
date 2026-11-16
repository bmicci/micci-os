// Nov 2026 audit: the import commit writes through the service client to the
// table named in the request, and "replace" deletes every row first. The
// table must be on the allowlist and a replace must be confirmed by name.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const calls: { table: string; op: string }[] = []
const service = {
  from: (table: string) => ({
    delete: () => { calls.push({ table, op: 'delete' }); return { neq: async () => ({ error: null }) } },
    insert: (rows: unknown[]) => { calls.push({ table, op: 'insert' }); return { select: async () => ({ data: rows, error: null }) } },
    upsert: async () => { calls.push({ table, op: 'upsert' }); return { error: null } },
  }),
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({}),
  createServiceClient: async () => service,
}))
vi.mock('@/lib/supabase/require-user', () => ({
  verifiedOwner: async () => ({ data: { user: { id: 'owner' } } }),
}))

const { POST } = await import('@/app/api/import/route')
const commit = (body: Record<string, unknown>) =>
  POST(new NextRequest('https://os.brandonmicci.com/api/import', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }))
const rows = [{ name: 'Netflix', amount: 15 }]

beforeEach(() => { calls.length = 0 })

describe('import commit guard', () => {
  it('rejects a table that is not on the allowlist', async () => {
    for (const dataType of ['plaid_items', 'financial_settings', 'action_items']) {
      const res = await commit({ rows, dataType, mode: 'replace', confirm: dataType })
      expect(res.status).toBe(400)
    }
    expect(calls).toEqual([])
  })
  it('rejects replace without the typed table name', async () => {
    expect((await commit({ rows, dataType: 'subscriptions', mode: 'replace' })).status).toBe(400)
    expect((await commit({ rows, dataType: 'subscriptions', mode: 'replace', confirm: 'debt_accounts' })).status).toBe(400)
    expect(calls).toEqual([])
  })
  it('rejects replacing a table with nothing', async () => {
    expect((await commit({ rows: [], dataType: 'subscriptions', mode: 'replace', confirm: 'subscriptions' })).status).toBe(400)
    expect(calls).toEqual([])
  })
  it('replaces when confirmed', async () => {
    const res = await commit({ rows, dataType: 'subscriptions', mode: 'replace', confirm: 'subscriptions' })
    expect(res.status).toBe(200)
    expect(calls.map(c => c.op)).toEqual(['delete', 'insert'])
  })
  it('merges without touching existing rows', async () => {
    const res = await commit({ rows, dataType: 'subscriptions', mode: 'upsert' })
    expect(res.status).toBe(200)
    expect(calls.map(c => c.op)).toEqual(['upsert'])
  })
})
