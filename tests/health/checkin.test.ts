// #32 · Daily check-in (PR #31): saving twice updates one row; a weigh-in creates one body_metrics row.
// The route runs against an in-memory stand-in for Supabase.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Row = Record<string, unknown>
const db: Record<string, Row[]> = {}
let nextId = 1

// Minimal PostgREST-shaped fake: eq filters, select/limit, insert, update, upsert(onConflict).
function from(table: string) {
  db[table] ??= []
  const filters: [string, unknown][] = []
  const rows = () => db[table].filter(r => filters.every(([k, v]) => r[k] === v))
  const q = {
    select: () => q,
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q },
    limit: (n: number) => Promise.resolve({ data: rows().slice(0, n), error: null }),
    insert: (row: Row) => { db[table].push({ id: nextId++, ...row }); return Promise.resolve({ error: null }) },
    update: (patch: Row) => ({
      eq: (k: string, v: unknown) => {
        db[table].filter(r => r[k] === v).forEach(r => Object.assign(r, patch))
        return Promise.resolve({ error: null })
      },
    }),
    upsert: (row: Row, { onConflict }: { onConflict: string }) => {
      const hit = db[table].find(r => r[onConflict] === row[onConflict])
      if (hit) Object.assign(hit, row)
      else db[table].push({ id: nextId++, ...row })
      return Promise.resolve({ error: null })
    },
  }
  return q
}

vi.mock('@/lib/supabase/require-user', () => ({ requireUser: vi.fn(async () => ({ id: 'owner' })) }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from }) }))
vi.mock('@/lib/health/dates', async orig => ({
  ...(await orig<typeof import('@/lib/health/dates')>()),
  chicagoToday: () => '2026-10-26',
}))

const { POST } = await import('@/app/api/health/checkin/route')
const { requireUser } = await import('@/lib/supabase/require-user')

const post = (body: unknown) =>
  POST(new NextRequest('https://os.brandonmicci.com/api/health/checkin', { method: 'POST', body: JSON.stringify(body) }))

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k]
  nextId = 1
})

describe('POST /api/health/checkin', () => {
  it('saving the same day twice leaves one row with the latest values', async () => {
    expect((await post({ checkin_date: '2026-10-26', lifted: true, energy_level: 6 })).status).toBe(200)
    expect((await post({ checkin_date: '2026-10-26', lifted: false, sauna: true })).status).toBe(200)
    expect(db.health_checkins).toHaveLength(1)
    expect(db.health_checkins[0]).toMatchObject({ checkin_date: '2026-10-26', lifted: false, sauna: true, energy_level: 6 })
  })

  it('a weigh-in creates exactly one body_metrics row per day, updated on re-save', async () => {
    await post({ checkin_date: '2026-10-26', weight_lbs: 195.4 })
    await post({ checkin_date: '2026-10-26', weight_lbs: 194.8 })
    await post({ checkin_date: '2026-10-25', weight_lbs: 196 })
    expect(db.body_metrics).toHaveLength(2)
    expect(db.body_metrics.find(r => r.metric_date === '2026-10-26')).toMatchObject({
      source: 'manual', external_id: 'checkin:2026-10-26', weight_lbs: 194.8, is_confirmed: true,
    })
  })

  it('writes no body_metrics row without a weight or waist', async () => {
    await post({ checkin_date: '2026-10-26', walk: true })
    expect(db.body_metrics ?? []).toHaveLength(0)
  })

  it('rejects future dates and dates older than 7 days', async () => {
    expect((await post({ checkin_date: '2026-10-27' })).status).toBe(400)
    expect((await post({ checkin_date: '2026-10-18' })).status).toBe(400)
    expect((await post({ checkin_date: '2026-10-19' })).status).toBe(200)
  })

  it('drops out-of-range values instead of saving them', async () => {
    await post({ checkin_date: '2026-10-26', energy_level: 11, sleep_hours: 7.3, weight_lbs: 20, session_type: 'cardio' })
    const row = db.health_checkins[0]
    expect(row.energy_level).toBeUndefined()
    expect(row.sleep_hours).toBe(7.5) // rounded to the half hour
    expect(row.weight_lbs).toBeUndefined()
    expect(row.session_type).toBeUndefined()
  })

  it('401s when the caller is not the verified owner', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(null)
    expect((await post({ lifted: true })).status).toBe(401)
    expect(db.health_checkins ?? []).toHaveLength(0)
  })
})
