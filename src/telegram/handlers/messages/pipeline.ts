import type { Bot, Context } from 'grammy'
import type { Config } from '../../../core/config'
import type { AccessStore } from '../../../access/store'
import { gate } from '../../../access/gate'
import { PERMISSION_REPLY_RE } from '../../../core/constants'
import type { AttachmentMeta } from '../../../core/types'
import { setReaction } from '../../reactions'
import type { NotifyFn } from '../deps'

// Núcleo comum a todas as modalidades (text/photo/document/...).
// Cada handler por modalidade extrai o conteúdo e chama deliver().
export class InboundPipeline {
  constructor(
    private readonly bot: Bot,
    private readonly config: Config,
    private readonly store: AccessStore,
    private readonly getBotUsername: () => string,
    private readonly notify: NotifyFn,
  ) {}

  async deliver(
    ctx: Context,
    text: string,
    downloadImage?: () => Promise<string | undefined>,
    attachment?: AttachmentMeta,
  ): Promise<void> {
    const result = gate(ctx, this.store, this.getBotUsername())

    if (result.action === 'drop') return

    if (result.action === 'pair') {
      const lead = result.isResend ? 'Ainda pendente' : 'Pareamento necessário'
      await ctx.reply(
        `${lead} — execute no Claude Code:\n\n/forge:access ${this.config.channelName} pair ${result.code}`,
      )
      return
    }

    const access = result.access
    const from = ctx.from!
    const chat_id = String(ctx.chat!.id)
    const msgId = ctx.message?.message_id

    // Resposta rápida do usuário a permission_request via texto (y/n <código>).
    const permMatch = PERMISSION_REPLY_RE.exec(text)
    if (permMatch) {
      this.notify('notifications/claude/channel/permission', {
        request_id: permMatch[2]!.toLowerCase(),
        behavior: permMatch[1]!.toLowerCase().startsWith('y') ? 'allow' : 'deny',
      })
      if (msgId != null) {
        const emoji = permMatch[1]!.toLowerCase().startsWith('y') ? '✅' : '❌'
        void setReaction(this.bot, chat_id, msgId, emoji).catch(() => {})
      }
      return
    }

    // "Estou processando" — não bloqueia se falhar.
    void this.bot.api.sendChatAction(chat_id, 'typing').catch(() => {})

    if (access.ackReaction && msgId != null) {
      void setReaction(this.bot, chat_id, msgId, access.ackReaction).catch(() => {})
    }

    const imagePath = downloadImage ? await downloadImage() : undefined

    this.notify('notifications/claude/channel', {
      content: text,
      meta: {
        chat_id,
        ...(msgId != null ? { message_id: String(msgId) } : {}),
        user: from.username ?? String(from.id),
        user_id: String(from.id),
        ts: new Date((ctx.message?.date ?? 0) * 1000).toISOString(),
        ...(imagePath ? { image_path: imagePath } : {}),
        ...(attachment
          ? {
              attachment_kind: attachment.kind,
              attachment_file_id: attachment.file_id,
              ...(attachment.size != null ? { attachment_size: String(attachment.size) } : {}),
              ...(attachment.mime ? { attachment_mime: attachment.mime } : {}),
              ...(attachment.name ? { attachment_name: attachment.name } : {}),
            }
          : {}),
      },
    })
  }
}
