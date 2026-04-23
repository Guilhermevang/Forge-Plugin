import type { Bot } from 'grammy'
import type { InboundPipeline } from './pipeline'

// Contrato de todo handler por modalidade (text/photo/document/voice/...).
// register() liga o bot.on(...) próprio e delega o resto à pipeline.
export interface ModalityHandler {
  register(bot: Bot, pipeline: InboundPipeline): void
}
