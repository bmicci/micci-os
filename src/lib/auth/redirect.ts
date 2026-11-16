// Post-login redirect targets come from the query string, so they must stay
// on this site. A leading "//" is a protocol-relative URL, and browsers
// treat "\" like "/" ("/\evil.com" leaves the site too); control characters
// (tab, newline) are stripped by URL parsers and can hide either one.
export function safeRedirectPath(target: string | null | undefined, fallback = '/financial'): string {
  if (!target) return fallback
  // eslint-disable-next-line no-control-regex
  if (!target.startsWith('/') || target.startsWith('//') || /[\\\u0000-\u001f]/.test(target)) return fallback
  return target
}
