import { z } from 'zod'
import type { Bot } from 'grammy'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AccessStore } from '../../access/store'
import { assertAllowedChat } from '../../access/assert'
import type { McpTool } from './deps'

const INPUT_SCHEMA = {
  chat_id: z.string(),
  message_id: z.string(),
  text: z.string(),
  format: z
    .enum(['text', 'markdownv2'])
    .optional()
    .describe("Modo de renderização. Default: 'text'."),
} as const

type EditArgs = {
  chat_id: string
  message_id: string
  text: string
  format?: 'text' | 'markdownv2'
}

export class EditTool implements McpTool {
  static readonly NAME = 'forge_edit_message'
  static readonly DESCRIPTION =
    'Edita uma mensagem enviada pelo bot. Útil para atualizações de progresso. Edições não geram push notification — envie uma nova mensagem ao concluir.'

  constructor(
    private readonly bot: Bot,
    private readonly store: AccessStore,
  ) {}

  register(mcp: McpServer): void {
    mcp.registerTool(
      EditTool.NAME,
      { description: EditTool.DESCRIPTION, inputSchema: INPUT_SCHEMA },
      async args => this.execute(args as EditArgs),
    )
  }

  private async execute(args: EditArgs) {
    assertAllowedChat(this.store, args.chat_id)
    const parseMode = args.format === 'markdownv2' ? ('MarkdownV2' as const) : undefined
    const edited = await this.bot.api.editMessageText(
      args.chat_id,
      Number(args.message_id),
      args.text,
      ...(parseMode ? [{ parse_mode: parseMode }] : []),
    )
    const id = typeof edited === 'object' ? edited.message_id : args.message_id
    return { content: [{ type: 'text' as const, text: `editado (id: ${id})` }] }
  }
}
