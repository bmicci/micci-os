import { timingSafeEqual } from 'node:crypto'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { createMicciMcpServer } from '@/lib/mcp/server'

// Remote MCP endpoint for Claude custom connectors (Streamable HTTP,
// stateless — a fresh read-only server per request).
//
// Auth: claude.ai connectors can't carry the app's session cookie, so this
// path is exempt from the session proxy and gated by a secret path segment
// instead: https://<host>/api/mcp/<MICCI_MCP_TOKEN>. Treat the full URL as a
// password; rotate by changing the env var. Every tool is SELECT-only.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const handler = createMcpHandler(() => createMicciMcpServer())

function authorized(token: string): boolean {
  const expected = process.env.MICCI_MCP_TOKEN
  if (!expected || expected.length < 32) return false // fail closed until a strong token is set
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function serve(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!authorized(token)) return new Response('Not found', { status: 404 })
  return handler.fetch(req)
}

export { serve as GET, serve as POST, serve as DELETE }
