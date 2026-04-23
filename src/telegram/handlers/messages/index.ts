import type { Bot } from 'grammy'
import type { Config } from '../../../core/config'
import type { AccessStore } from '../../../access/store'
import type { NotifyFn } from '../deps'
import { InboundPipeline } from './pipeline'
import type { ModalityHandler } from './modality'
import { TextHandler } from './text'
import { PhotoHandler } from './photo'
import { DocumentHandler } from './document'
import { VoiceHandler } from './voice'

export type { ModalityHandler } from './modality'
export { InboundPipeline } from './pipeline'

// Re-exports para o agregador externo poder importar sem conhecer a estrutura interna.
export type MessageRouterOptions = {
  bot: Bot
  config: Config
  store: AccessStore
  getBotUsername: () => string
  notify: NotifyFn
}

// Roteador: registra um ModalityHandler por tipo de mensagem.
// Para adicionar áudio/vídeo: criar classe implements ModalityHandler e registrar no constructor.
export class MessageRouter {
  private readonly bot: Bot
  private readonly pipeline: InboundPipeline
  private readonly handlers: ModalityHandler[]

  constructor(opts: MessageRouterOptions) {
    this.bot = opts.bot
    this.pipeline = new InboundPipeline(
      opts.bot,
      opts.config,
      opts.store,
      opts.getBotUsername,
      opts.notify,
    )
    this.handlers = [
      new TextHandler(),
      new PhotoHandler(opts.config),
      new DocumentHandler(),
      new VoiceHandler(opts.store),
    ]
  }

  register(): void {
    for (const h of this.handlers) h.register(this.bot, this.pipeline)
  }
}
