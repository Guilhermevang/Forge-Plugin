import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// Contrato dos wrappers de tools: cada um registra a si mesmo no McpServer.
// A validação dos args é feita pelo próprio SDK via Zod — o handler já recebe args tipados.
export interface McpTool {
  register(mcp: McpServer): void
}
