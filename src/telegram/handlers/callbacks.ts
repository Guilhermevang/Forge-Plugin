import { InlineKeyboard, type Bot } from 'grammy'
import type { AccessStore } from '../../access/store'
import type { PermissionRequest } from '../../core/types'
import type { NotifyFn } from './deps'

export class CallbackHandlers {
  constructor(
    private readonly bot: Bot,
    private readonly store: AccessStore,
    private readonly notify: NotifyFn,
    private readonly pendingPermissions: Map<string, PermissionRequest>,
  ) {}

  register(): void {
    this.bot.on('callback_query:data', async ctx => {
      const data = ctx.callbackQuery.data
      const m = /^perm:(allow|deny|more):([a-km-z]{5})$/.exec(data)
      if (!m) {
        await ctx.answerCallbackQuery().catch(() => {})
        return
      }
      const access = this.store.load()
      const senderId = String(ctx.from.id)
      if (!access.allowFrom.includes(senderId)) {
        await ctx.answerCallbackQuery({ text: 'Não autorizado.' }).catch(() => {})
        return
      }
      const [, behavior, request_id] = m

      if (behavior === 'more') {
        const details = this.pendingPermissions.get(request_id)
        if (!details) {
          await ctx.answerCallbackQuery({ text: 'Detalhes não disponíveis.' }).catch(() => {})
          return
        }
        const { tool_name, description, input_preview } = details
        let prettyInput: string
        try {
          prettyInput = JSON.stringify(JSON.parse(input_preview), null, 2)
        } catch {
          prettyInput = input_preview
        }
        const expanded =
          `🔐 Permissão: ${tool_name}\n\n` +
          `tool_name: ${tool_name}\n` +
          `description: ${description}\n` +
          `input_preview:\n${prettyInput}`
        const keyboard = new InlineKeyboard()
          .text('✅ Permitir', `perm:allow:${request_id}`)
          .text('❌ Negar', `perm:deny:${request_id}`)
        await ctx.editMessageText(expanded, { reply_markup: keyboard }).catch(() => {})
        await ctx.answerCallbackQuery().catch(() => {})
        return
      }

      this.notify('notifications/claude/channel/permission', { request_id, behavior })
      this.pendingPermissions.delete(request_id)
      const label = behavior === 'allow' ? '✅ Permitido' : '❌ Negado'
      await ctx.answerCallbackQuery({ text: label }).catch(() => {})
      const msg = ctx.callbackQuery.message
      if (msg && 'text' in msg && msg.text) {
        await ctx.editMessageText(`${msg.text}\n\n${label}`).catch(() => {})
      }
    })
  }
}
