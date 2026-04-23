import { z } from 'zod'
import { InlineKeyboard, type Bot } from 'grammy'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AccessStore } from '../access/store'
import type { PermissionRequest } from '../core/types'

// Gerencia o handshake de permissões entre Claude Code e usuário via Telegram.
// Claude notifica permission_request → bot envia inline keyboard ao Telegram → usuário decide.
export class PermissionBroker {
  readonly pending = new Map<string, PermissionRequest>()

  constructor(
    private readonly mcp: McpServer,
    private readonly bot: Bot,
    private readonly store: AccessStore,
  ) {}

  register(): void {
    // setNotificationHandler não existe no high-level McpServer — acessamos o Server subjacente.
    this.mcp.server.setNotificationHandler(
      z.object({
        method: z.literal('notifications/claude/channel/permission_request'),
        params: z.object({
          request_id: z.string(),
          tool_name: z.string(),
          description: z.string(),
          input_preview: z.string(),
        }),
      }),
      async ({ params }) => {
        const { request_id, tool_name, description, input_preview } = params
        this.pending.set(request_id, { tool_name, description, input_preview })
        const access = this.store.load()
        const text = `🔐 Permissão: ${tool_name}`
        const keyboard = new InlineKeyboard()
          .text('Ver mais', `perm:more:${request_id}`)
          .text('✅ Permitir', `perm:allow:${request_id}`)
          .text('❌ Negar', `perm:deny:${request_id}`)
        // Broadcast para todos os pareados — geralmente só 1, mas múltiplos são possíveis.
        for (const chat_id of access.allowFrom) {
          void this.bot.api.sendMessage(chat_id, text, { reply_markup: keyboard }).catch(e => {
            process.stderr.write(`forge channel: permission_request para ${chat_id} falhou: ${e}\n`)
          })
        }
      },
    )
  }
}
