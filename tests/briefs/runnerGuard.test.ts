// Guard rails for the API-key briefs runner: off unless explicitly on, any bad
// setting turns it off, and the budget check fails closed.
import { describe, expect, it } from 'vitest'
import { checkBudget, estimateCostUsd, monthStartIso, readRunnerConfig, worstCaseRunUsd } from '@/lib/briefsRunner/guard'
import { extractJson, BriefDocSchema } from '@/lib/briefsRunner/schema'
import { snapshotFromPositions } from '@/lib/briefsRunner/portfolio'

const on = { BRIEFS_API_ENABLED: 'true', ANTHROPIC_API_KEY: 'test-key' }

describe('readRunnerConfig', () => {
  it('is off by default and off for anything but "true"', () => {
    expect(readRunnerConfig({}).ok).toBe(false)
    expect(readRunnerConfig({ ...on, BRIEFS_API_ENABLED: '1' }).ok).toBe(false)
    expect(readRunnerConfig({ ...on, BRIEFS_API_ENABLED: 'TRUE' }).ok).toBe(false)
  })
  it('needs a key', () => {
    expect(readRunnerConfig({ BRIEFS_API_ENABLED: 'true' }).ok).toBe(false)
  })
  it('defaults to Haiku with small limits', () => {
    const r = readRunnerConfig(on)
    expect(r.ok && r.config).toEqual({ model: 'claude-haiku-5-5', maxTokensPerCall: 4000, maxSearchesPerCall: 4, monthlyCapUsd: 5 })
  })
  it('turns off on a model outside the allow list or a bad limit', () => {
    expect(readRunnerConfig({ ...on, BRIEFS_API_MODEL: 'claude-opus-5-5' }).ok).toBe(false)
    expect(readRunnerConfig({ ...on, BRIEFS_API_MAX_TOKENS: '99999' }).ok).toBe(false)
    expect(readRunnerConfig({ ...on, BRIEFS_API_MAX_SEARCHES: '0' }).ok).toBe(false)
    expect(readRunnerConfig({ ...on, BRIEFS_API_MONTHLY_CAP_USD: 'abc' }).ok).toBe(false)
    expect(readRunnerConfig({ ...on, BRIEFS_API_MONTHLY_CAP_USD: '500' }).ok).toBe(false)
  })
})

describe('cost math', () => {
  it('prices tokens and searches', () => {
    // 10K in at $0.10/M + 2K out at $0.50/M + 3 searches at $0.01
    expect(estimateCostUsd('claude-haiku-5-5', { input_tokens: 10_000, output_tokens: 2_000, server_tool_use: { web_search_requests: 3 } }))
      .toBeCloseTo(0.001 + 0.001 + 0.03, 6)
  })
  it('worst case for a default weekday run stays well under the default cap', () => {
    const r = readRunnerConfig(on)
    if (!r.ok) throw new Error('expected on')
    const worst = worstCaseRunUsd(r.config, 3, 2)
    // 3 × (60K × 0.10 + 4K × 0.50)/1M + 2 × 4 × $0.01 = 0.024 + 0.08
    expect(worst).toBeCloseTo(0.104, 6)
  })
})

describe('checkBudget', () => {
  const r = readRunnerConfig(on)
  if (!r.ok) throw new Error('expected on')
  it('fails closed when spend is unreadable', () => {
    expect(checkBudget(r.config, null, 0.1).go).toBe(false)
    expect(checkBudget(r.config, Number.NaN, 0.1).go).toBe(false)
  })
  it('refuses a run that could cross the cap', () => {
    expect(checkBudget(r.config, 4.95, 0.1).go).toBe(false)
    expect(checkBudget(r.config, 4.5, 0.1).go).toBe(true)
  })
  it('counts the month from the 1st', () => {
    expect(monthStartIso('2026-11-23')).toBe('2026-11-01T00:00:00Z')
  })
})

describe('model reply parsing', () => {
  it('reads fenced JSON and rejects bad shapes', () => {
    const doc = extractJson('```json\n{"headline":"Rent due Friday","blocks":[{"type":"text","title":"Heads-up","body":"x"}]}\n```')
    expect(BriefDocSchema.safeParse(doc).success).toBe(true)
    expect(BriefDocSchema.safeParse({ headline: 'x', blocks: [] }).success).toBe(false)
    expect(() => extractJson('no json here')).toThrow()
  })
})

describe('snapshotFromPositions', () => {
  it('builds totals in code, not from the model', () => {
    const s = snapshotFromPositions([
      { ticker: 'QQQ', current_price: 500, current_value: 10_000, cost_basis: 8_000, day_change_pct: 1 },
      { ticker: 'CASH', current_value: 2_000, is_cash: true },
      { ticker: 'OLD', current_value: 0 },
    ])
    expect(s?.account_est).toBe(12_000)
    expect(s?.cash).toBe(2_000)
    expect(s?.vs_cost_upl_pct).toBe(25)
    expect(Object.keys(s?.prices ?? {})).toEqual(['QQQ'])
    expect(snapshotFromPositions([])).toBeNull()
  })
})
