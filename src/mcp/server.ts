import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { buildInstructions } from './instructions'
import { ToolRegistry, registerToolStubs } from './tools'
import { VERSION } from '../core/version'

export type ForgeMcpServerOptions = {
  agentsDir: string
  configError: string | null
  registry: ToolRegistry | null
}

// Wrapper sobre McpServer (high-level) — expõe registro de tools + notifications custom
// (as notifications "claude/channel/*" não passam pelo high-level, então usamos o server raw).
export class ForgeMcpServer {
  readonly mcp: McpServer

  constructor(opts: ForgeMcpServerOptions) {
    this.mcp = new McpServer(
      { name: 'forge', version: VERSION },
      {
        capabilities: {
          tools: {},
          // Namespace proprietário do Claude Code — fora do spec MCP padrão.
          experimental: {
            'claude/channel': {},
            'claude/channel/permission': {},
          },
        },
        instructions: buildInstructions(opts.agentsDir),
      },
    )

    if (opts.registry) {
      opts.registry.registerAll(this.mcp)
    } else if (opts.configError) {
      registerToolStubs(this.mcp, opts.configError)
    }
  }

  async connect(): Promise<void> {
    await this.mcp.connect(new StdioServerTransport())
  }

  async close(): Promise<void> {
    await this.mcp.close()
  }

  // Notifica o Claude Code (ex.: nova mensagem no canal, decisão de permissão).
  // Usa o transport subjacente — McpServer não expõe API high-level para notifications custom.
  notify(method: string, params: unknown): void {
    void this.mcp.server
      .notification({ method, params: params as Record<string, unknown> })
      .catch(err => {
        process.stderr.write(`forge channel: falha ao notificar ${method}: ${err}\n`)
      })
  }
}
