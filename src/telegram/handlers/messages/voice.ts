import type { Bot } from 'grammy'
import type { AccessStore } from '../../../access/store'
import type { InboundPipeline } from './pipeline'
import type { ModalityHandler } from './modality'

// Forge opera só com texto/imagens/documentos. Voz é explicitamente rejeitada
// com mensagem amigável (só para quem já está pareado — evita responder a spam).
export class VoiceHandler implements ModalityHandler {
  constructor(private readonly store: AccessStore) {}

  register(bot: Bot, _pipeline: InboundPipeline): void {
    bot.on('message:voice', async ctx => {
      const from = ctx.from
      if (!from) return
      const access = this.store.load()
      if (access.allowFrom.includes(String(from.id))) {
        await ctx.reply('Mensagens de voz não são suportadas pelo Forge. Envie sua tarefa como texto.')
      }
    })
  }
}
