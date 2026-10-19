import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isOwner } from '@/lib/auth/owner'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not add logic between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Vercel cron endpoints: cron invocations carry no session cookie, so the
  // session gate below would 307 them to /login before the handler ever ran —
  // this is why the crons never fired (found Sep 27, 2026). Their GET
  // handlers enforce CRON_SECRET themselves; POST (manual sync/refresh from
  // the app) stays behind the session gate.
  const isCronEndpoint =
    request.method === 'GET' &&
    (pathname === '/api/plaid/sync' || pathname === '/api/investments/refresh-prices')

  // Remote MCP endpoint for Claude connectors: no session cookie either.
  // The route 404s unless the path's secret matches MICCI_MCP_TOKEN.
  const isMcpEndpoint = pathname.startsWith('/api/mcp/')

  // Public paths that don't require auth
  const isPublic =
    isCronEndpoint ||
    isMcpEndpoint ||
    pathname === '/login' ||
    pathname === '/auth/callback' || // OAuth return: exchanges ?code= itself
    pathname === '/robots.txt' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)

  // Access policy (lib/auth/owner.ts): owner via Google SSO + second factor.
  const owner = user != null && isOwner(user)
  let mfaPassed = false
  if (owner) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    mfaPassed = aal?.currentLevel === 'aal2'
  }
  const isMfaPage = pathname === '/mfa'
  const withCookies = (res: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c))
    return res
  }
  const toLogin = (search: string) =>
    NextResponse.redirect(Object.assign(request.nextUrl.clone(), { pathname: '/login', search }))
  const backTo = () => {
    const target = request.nextUrl.searchParams.get('redirectTo') || '/financial'
    // Same-origin paths only
    const safe = target.startsWith('/') && !target.startsWith('//') ? target : '/financial'
    return NextResponse.redirect(new URL(safe, request.nextUrl.origin))
  }

  // Signed in, but not the owner (wrong account, or not via Google SSO):
  // end that session. Every data route trusts "signed in", so this is the gate.
  if (user && !owner && !isPublic) {
    await supabase.auth.signOut()
    return withCookies(pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      : toLogin('?error=not_authorized'))
  }

  if (!user && !isPublic) {
    return pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : toLogin(`?redirectTo=${encodeURIComponent(pathname)}`)
  }

  // Owner who hasn't passed the second factor this session: only /mfa.
  if (owner && !mfaPassed && !isPublic && !isMfaPage) {
    return withCookies(pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'mfa_required' }, { status: 401 })
      : NextResponse.redirect(Object.assign(request.nextUrl.clone(), {
          pathname: '/mfa', search: `?redirectTo=${encodeURIComponent(pathname)}`,
        })))
  }

  if (owner && !mfaPassed && pathname === '/login') {
    return withCookies(NextResponse.redirect(new URL('/mfa', request.nextUrl.origin)))
  }

  if (owner && mfaPassed && (pathname === '/login' || isMfaPage)) {
    return withCookies(backTo())
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
