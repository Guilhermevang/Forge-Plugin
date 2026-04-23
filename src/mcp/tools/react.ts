import { z } from 'zod'
import type { Bot } from 'grammy'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AccessStore } from '../../access/store'
import { assertAllowedChat } from '../../access/assert'
import { setReaction } from '../../telegram/reactions'
import type { McpTool } from './deps'

const INPUT_SCHEMA = {
  chat_id: z.string(),
  message_id: z.string(),
  emoji: z.string(),
} as const

type ReactArgs = { chat_id: string; message_id: string; emoji: string }

export class ReactTool implements McpTool {
  static readonly NAME = 'forge_react'
  static readonly DESCRIPTION =
    'Adiciona uma reação emoji a uma mensagem Telegram. Telegram aceita apenas uma lista fixa de emojis.'

  constructor(
    private readonly bot: Bot,
    private readonly store: AccessStore,
  ) {}

  register(mcp: McpServer): void {
    mcp.registerTool(
      ReactTool.NAME,
      { description: ReactTool.DESCRIPTION, inputSchema: INPUT_SCHEMA },
      async args => this.execute(args as ReactArgs),
    )
  }

  private async execute(args: ReactArgs) {
    assertAllowedChat(this.store, args.chat_id)
    await setReaction(this.bot, args.chat_id, Number(args.message_id), args.emoji)
    return { content: [{ type: 'text' as const, text: 'reagido' }] }
  }
}
