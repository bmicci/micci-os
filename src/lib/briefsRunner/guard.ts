// ───────────────────────────────────────────────────────────────────────────
// Guard rails for the API-key briefs runner (docs/BRIEFS_RUNNER.md).
//
// Pure: config from env, a cost estimate from the API's usage numbers, and the
// go / no-go decision before each run. Everything fails closed: a missing or
// malformed setting, an unreadable spend total or a cap that the next run
// could cross all mean "don't call the API".
// ───────────────────────────────────────────────────────────────────────────

/** List prices in USD per million tokens (checked Nov 2026; Haiku 5.5 rate is for prompts under 100K tokens). */
export const PRICING = {
  'claude-haiku-5-5': { inputPerM: 0.10, outputPerM: 0.50 },
  'claude-sonnet-5-5': { inputPerM: 2.00, outputPerM: 10.00 },
} as const
/** Web search: $10 per 1,000 searches. */
export const WEB_SEARCH_USD = 10 / 1000

export type RunnerModel = keyof typeof PRICING

export interface RunnerConfig {
  model: RunnerModel
  /** Hard cap on output tokens per API call (`max_tokens`). */
  maxTokensPerCall: number
  /** Hard cap on web searches per call (`max_uses` on the search tool). */
  maxSearchesPerCall: number
  /** Stop for the rest of the month once estimated spend could pass this. */
  monthlyCapUsd: number
}

export type ConfigResult =
  | { ok: true; config: RunnerConfig }
  | { ok: false; reason: string }

type Env = Record<string, string | undefined>

const posNum = (v: string | undefined, fallback: number, max: number): number | null => {
  if (v == null || v.trim() === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) && n > 0 && n <= max ? n : null
}

/**
 * Reads the runner's settings. Off unless BRIEFS_API_ENABLED is exactly
 * "true"; any malformed limit turns it off rather than falling back.
 */
export function readRunnerConfig(env: Env): ConfigResult {
  if (env.BRIEFS_API_ENABLED !== 'true') return { ok: false, reason: 'disabled (BRIEFS_API_ENABLED is not "true")' }
  if (!env.ANTHROPIC_API_KEY) return { ok: false, reason: 'ANTHROPIC_API_KEY is not set' }
  const model = env.BRIEFS_API_MODEL ?? 'claude-haiku-5-5'
  if (!(model in PRICING)) return { ok: false, reason: `model ${model} is not on the allow list` }
  const maxTokens = posNum(env.BRIEFS_API_MAX_TOKENS, 4000, 16000)
  const maxSearches = posNum(env.BRIEFS_API_MAX_SEARCHES, 4, 10)
  const cap = posNum(env.BRIEFS_API_MONTHLY_CAP_USD, 5, 50)
  if (maxTokens == null) return { ok: false, reason: 'BRIEFS_API_MAX_TOKENS is invalid (1 to 16000)' }
  if (maxSearches == null) return { ok: false, reason: 'BRIEFS_API_MAX_SEARCHES is invalid (1 to 10)' }
  if (cap == null) return { ok: false, reason: 'BRIEFS_API_MONTHLY_CAP_USD is invalid (above 0, up to 50)' }
  return {
    ok: true,
    config: {
      model: model as RunnerModel,
      maxTokensPerCall: Math.floor(maxTokens),
      maxSearchesPerCall: Math.floor(maxSearches),
      monthlyCapUsd: cap,
    },
  }
}

export interface UsageLike {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
  server_tool_use?: { web_search_requests?: number | null } | null
}

/** Estimated USD for one call (cache writes at 1.25x input, reads at 0.1x). */
export function estimateCostUsd(model: RunnerModel, u: UsageLike): number {
  const p = PRICING[model]
  const input = u.input_tokens + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1
  const searches = u.server_tool_use?.web_search_requests ?? 0
  return (input * p.inputPerM + u.output_tokens * p.outputPerM) / 1_000_000 + searches * WEB_SEARCH_USD
}

/**
 * Worst case for one run: every call uses its full output cap and every
 * allowed search, plus `inputTokensPerCall` of input (search results count as
 * input). Used to refuse a run that could cross the monthly cap, not only one
 * that already has.
 */
export function worstCaseRunUsd(c: RunnerConfig, calls: number, searchCalls: number, inputTokensPerCall = 60_000): number {
  const p = PRICING[c.model]
  const perCall = (inputTokensPerCall * p.inputPerM + c.maxTokensPerCall * p.outputPerM) / 1_000_000
  return calls * perCall + searchCalls * c.maxSearchesPerCall * WEB_SEARCH_USD
}

export type BudgetDecision = { go: true; remainingUsd: number } | { go: false; reason: string }

/** `spentUsd` null means the month's spend couldn't be read: fail closed. */
export function checkBudget(c: RunnerConfig, spentUsd: number | null, nextRunWorstUsd: number): BudgetDecision {
  if (spentUsd == null || !Number.isFinite(spentUsd)) return { go: false, reason: "couldn't read this month's spend" }
  if (spentUsd + nextRunWorstUsd > c.monthlyCapUsd) {
    return {
      go: false,
      reason: `monthly cap: spent $${spentUsd.toFixed(2)} of $${c.monthlyCapUsd.toFixed(2)}, next run could cost up to $${nextRunWorstUsd.toFixed(2)}`,
    }
  }
  return { go: true, remainingUsd: c.monthlyCapUsd - spentUsd }
}

/** Start of the month for the spend total (UTC midnight on the 1st; a few hours early is fine for a cap). */
export function monthStartIso(today: string): string {
  return `${today.slice(0, 7)}-01T00:00:00Z`
}
