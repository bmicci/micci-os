// Every Micci OS tool, in the order surfaces list them. Add new tool modules
// here; each surface (MCP server, in-app chat) adapts this one list.
import type { AnyMicciTool } from './tool'
import { financeTools } from './tools/finance'
import { briefsTools } from './tools/briefs'
import { actionsTools } from './tools/actions'

export const MICCI_TOOLS: readonly AnyMicciTool[] = [...financeTools, ...briefsTools, ...actionsTools]
