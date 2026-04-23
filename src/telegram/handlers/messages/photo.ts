import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Api, Bot } from 'grammy'
import type { PhotoSize } from 'grammy/types'
import type { Config } from '../../../core/config'
import type { InboundPipeline } from './pipeline'
import type { ModalityHandler } from './modality'

export class PhotoHandler implements ModalityHandler {
  constructor(private readonly config: Config) {}

  register(bot: Bot, pipeline: InboundPipeline): void {
    bot.on('message:photo', async ctx => {
      const caption = ctx.message.caption ?? '(foto)'
      // Telegram entrega várias resoluções — a última é a maior.
      const best = ctx.message.photo[ctx.message.photo.length - 1]
      await pipeline.deliver(ctx, caption, () => this.download(ctx.api, best))
    })
  }

  private async download(api: Api, photo: PhotoSize): Promise<string | undefined> {
    try {
      const file = await api.getFile(photo.file_id)
      if (!file.file_path) return undefined
      const url = `https://api.telegram.org/file/bot${this.config.token}/${file.file_path}`
      const res = await fetch(url)
      const buf = Buffer.from(await res.arrayBuffer())
      const ext = file.file_path.split('.').pop() ?? 'jpg'
      const path = join(this.config.inboxDir, `${Date.now()}-${photo.file_unique_id}.${ext}`)
      mkdirSync(this.config.inboxDir, { recursive: true })
      writeFileSync(path, buf)
      return path
    } catch (err) {
      process.stderr.write(`forge channel: download de foto falhou: ${err}\n`)
      return undefined
    }
  }
}
