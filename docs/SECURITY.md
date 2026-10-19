# micci-os — Access & Security

Single-owner app holding one person's finances. Policy lives in
`src/lib/auth/owner.ts`; enforced in `src/proxy.ts` (every request) and again
in every API route (`verifiedOwner` / `requireUser` in
`src/lib/supabase/require-user.ts`).

## Who gets in
1. **SSO** — Google only (magic-link email sign-in removed Oct 19, 2026), and
   only allowlisted accounts: default `brandon@brandonmicci.com` (Google
   Workspace, protected by Google 2-Step Verification). Override with the
   `MICCI_ALLOWED_EMAILS` env var (comma-separated). Any other signed-in
   account is signed out immediately.
2. **Second factor** — TOTP authenticator code on every new session
   (Supabase MFA, assurance level `aal2`). First visit to `/mfa` enrolls the
   authenticator; pages redirect to `/mfa` and APIs return
   `401 {error:"mfa_required"}` until it's passed.

**Lost phone:** delete the factor in Supabase → Authentication → Users →
brandon@brandonmicci.com → MFA factors, then sign in and re-enroll.

## Machine endpoints (no browser session)
| Path | Auth |
|---|---|
| `GET /api/plaid/sync`, `GET /api/investments/refresh-prices` | `Authorization: Bearer $CRON_SECRET` (Vercel cron) |
| `/api/mcp/<token>` | secret path segment = `MICCI_MCP_TOKEN` (≥32 chars), read-only tools. Treat the URL as a password; rotate by changing the env var |
| `/auth/callback` | OAuth code exchange; `next` limited to same-origin paths |

## Headers (next.config.ts)
HSTS (2y, includeSubDomains), `X-Frame-Options: DENY` + CSP
`frame-ancestors 'none'`, nosniff, strict referrer, Permissions-Policy
(camera/mic/geo/payment off), `X-Robots-Tag: noindex` + `robots.txt`
disallow-all, no `X-Powered-By`.

## Data
Supabase RLS on every table; service-role client server-only. Plaid access
tokens stay in `plaid_items` (deny-all RLS), never sent to the browser.
Statement PDFs in the private `statements` bucket, served only via 5-minute
signed URLs to the owner.

## Custom domain — os.brandonmicci.com
brandonmicci.com DNS is on Vercel (same team), so the subdomain is attached
to the micci-os project in Vercel → Domains (CNAME + TLS automatic). Attach
it only once SSO + MFA are live in production. Then:
- Supabase → Authentication → URL Configuration: Site URL
  `https://os.brandonmicci.com`; add redirect URL
  `https://os.brandonmicci.com/auth/callback` (keep the vercel.app one until
  the switch is done).
- Plaid → API → Allowed redirect URIs: add `https://os.brandonmicci.com/import`.
- Google OAuth needs no change (it returns to Supabase, not the app).
- Claude connector: optionally re-add with the new host; the old
  micci-os.vercel.app URL keeps working.
