import type { Bot } from 'grammy'
import type { InboundPipeline } from './pipeline'
import type { ModalityHandler } from './modality'

// Remove caracteres que poderiam escapar do bloco <channel> ou quebrar a renderização.
function safeName(s: string | undefined): string | undefined {
  return s?.replace(/[<>\[\]\r\n;]/g, '_')
}

export class DocumentHandler implements ModalityHandler {
  register(bot: Bot, pipeline: InboundPipeline): void {
    bot.on('message:document', async ctx => {
      const doc = ctx.message.document
      const name = safeName(doc.file_name)
      const text = ctx.message.caption ?? `(documento: ${name ?? 'arquivo'})`
      // O arquivo em si só é baixado sob demanda via forge_download_attachment.
      await pipeline.deliver(ctx, text, undefined, {
        kind: 'document',
        file_id: doc.file_id,
        size: doc.file_size,
        mime: doc.mime_type,
        name,
      })
    })
  }
}
