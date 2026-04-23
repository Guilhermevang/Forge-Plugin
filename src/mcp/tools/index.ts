import { z } from 'zod'
import type { Bot } from 'grammy'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Config } from '../../core/config'
import type { AccessStore } from '../../access/store'
import { ReplyTool } from './reply'
import { ReactTool } from './react'
import { DownloadTool } from './download'
import { EditTool } from './edit'
import { ReplyVoiceTool } from './reply-voice'
import type { TtsService } from '../../tts'
import type { McpTool } from './deps'

export type { McpTool } from './deps'

// Metadados estáticos de cada tool — usados no modo configError onde não há bot.
const STUB_METADATA: Array<{ name: string; description: string }> = [
  { name: ReplyTool.NAME, description: ReplyTool.DESCRIPTION },
  { name: ReactTool.NAME, description: ReactTool.DESCRIPTION },
  { name: DownloadTool.NAME, description: DownloadTool.DESCRIPTION },
  { name: EditTool.NAME, description: EditTool.DESCRIPTION },
  { name: ReplyVoiceTool.NAME, description: ReplyVoiceTool.DESCRIPTION },
]

// Registra todas as tools reais no McpServer. Uso em modo normal (canal + token OK).
export class ToolRegistry {
  private readonly tools: McpTool[]

  constructor(bot: Bot, config: Config, store: AccessStore, tts: TtsService) {
    this.tools = [
      new ReplyTool(bot, config, store),
      new ReactTool(bot, store),
      new DownloadTool(bot, config),
      new EditTool(bot, store),
      new ReplyVoiceTool(bot, store, tts),
    ]
  }

  registerAll(mcp: McpServer): void {
    for (const t of this.tools) t.register(mcp)
  }
}

// Modo configError: tools ficam listadas para o cliente saber que existem,
// mas toda invocação retorna o erro de configuração.
export function registerToolStubs(mcp: McpServer, errorMsg: string): void {
  for (const { name, description } of STUB_METADATA) {
    mcp.registerTool(name, { description, inputSchema: { _unused: z.unknown().optional() } }, async () => ({
      content: [{ type: 'text', text: errorMsg }],
      isError: true,
    }))
  }
}
