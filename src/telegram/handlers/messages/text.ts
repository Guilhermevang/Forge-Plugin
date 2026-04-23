import type { Bot } from 'grammy'
import type { InboundPipeline } from './pipeline'
import type { ModalityHandler } from './modality'

export class TextHandler implements ModalityHandler {
  register(bot: Bot, pipeline: InboundPipeline): void {
    bot.on('message:text', async ctx => {
      await pipeline.deliver(ctx, ctx.message.text)
    })
  }
}
