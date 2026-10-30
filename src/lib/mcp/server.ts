// ───────────────────────────────────────────────────────────────────────────
// Micci OS MCP server — read-only finance + briefs tools for Claude.
//
// The tools themselves live in ./tools/* (registered in ./registry.ts) so the
// in-app chat can use the same definitions; this file only adapts them to
// MCP. Every number comes from the same code paths as /financial
// (getFinancialData → lib/finance/*), so an answer in Claude matches the app.
// No tool writes anything: the server holds the service client but only
// ever SELECTs. Mounted at /api/mcp/[token] (see the route for auth).
// ───────────────────────────────────────────────────────────────────────────

import { McpServer } from '@modelcontextprotocol/server'
import { getFinancialData } from '@/lib/financial-data-service'
import { MICCI_TOOLS } from './registry'
import { createToolContext } from './tool'

export function createMicciMcpServer(): McpServer {
  const server = new McpServer({ name: 'micci-os', version: '1.0.0' })

  // One getFinancialData() per request instance (a server is created per HTTP request).
  const ctx = createToolContext(getFinancialData)

  for (const t of MICCI_TOOLS) {
    const config = { title: t.title, description: t.description, annotations: t.annotations }
    if (t.inputSchema) server.registerTool(t.name, { ...config, inputSchema: t.inputSchema }, args => t.handler(args, ctx))
    else server.registerTool(t.name, config, () => t.handler({}, ctx))
  }

  return server
}
