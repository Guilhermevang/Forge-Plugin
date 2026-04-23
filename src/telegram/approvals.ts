import { readdirSync, rmSync } from 'fs'
import { join } from 'path'
import type { Bot } from 'grammy'
import type { Config } from '../core/config'

export class ApprovalsWatcher {
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly config: Config,
    private readonly bot: Bot,
  ) {}

  start(): void {
    if (this.config.static) return
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 5000)
    this.timer.unref()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private tick(): void {
    let files: string[]
    try {
      files = readdirSync(this.config.approvedDir)
    } catch {
      return
    }
    if (files.length === 0) return
    for (const senderId of files) {
      const file = join(this.config.approvedDir, senderId)
      void this.bot.api.sendMessage(senderId, 'Pareado! Pode mandar suas tarefas.').then(
        () => rmSync(file, { force: true }),
        err => {
          process.stderr.write(`forge channel: falha ao enviar confirmação de aprovação: ${err}\n`)
          rmSync(file, { force: true })
        },
      )
    }
  }
}
