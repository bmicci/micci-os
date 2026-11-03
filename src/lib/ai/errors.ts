/** Turn raw Anthropic API errors into a message the owner can act on. */
export function friendlyAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/credit balance is too low/i.test(msg)) {
    return 'Anthropic API credits ran out. Add credits at console.anthropic.com → Plans & Billing, then press ↻ to retry.'
  }
  if (/authentication_error|invalid x-api-key/i.test(msg)) {
    return 'Anthropic API key is missing or invalid (ANTHROPIC_API_KEY in Vercel).'
  }
  if (/overloaded_error|rate_limit_error|\b529\b|\b429\b/i.test(msg)) {
    return 'Claude is busy right now. Press ↻ to retry in a minute.'
  }
  return msg
}
