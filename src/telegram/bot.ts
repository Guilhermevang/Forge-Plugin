import { Bot, GrammyError } from 'grammy'

export class TelegramBot {
  readonly bot: Bot
  private botUsername = ''
  private resolveReady: (v: { username: string }) => void = () => {}
  readonly botReady: Promise<{ username: string }>

  constructor(
    token: string,
    private readonly onShuttingDown: () => boolean,
  ) {
    this.bot = new Bot(token)
    this.botReady = new Promise<{ username: string }>(res => {
      this.resolveReady = res
    })
    this.bot.catch(err => {
      process.stderr.write(`forge channel: erro no handler (polling continua): ${err.error}\n`)
    })
  }

  get username(): string {
    return this.botUsername
  }

  async start(): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.bot.start({
          onStart: info => {
            attempt = 0
            this.botUsername = info.username
            this.resolveReady({ username: info.username })
            process.stderr.write(`forge channel: polling como @${info.username}\n`)
            void this.bot.api
              .setMyCommands(
                [
                  { command: 'start', description: 'Boas-vindas e instruções de setup' },
                  { command: 'help', description: 'O que este bot pode fazer' },
                  { command: 'status', description: 'Verificar seu status de pareamento' },
                  { command: 'mode', description: 'Trocar modo de permissão: /mode edit ou /mode ask' },
                ],
                { scope: { type: 'all_private_chats' } },
              )
              .catch(() => {})
          },
        })
        return
      } catch (err) {
        if (this.onShuttingDown()) return
        if (err instanceof Error && err.message === 'Aborted delay') return
        const is409 = err instanceof GrammyError && err.error_code === 409
        if (is409 && attempt >= 8) {
          process.stderr.write(
            `forge channel: 409 Conflict persiste após ${attempt} tentativas — ` +
              `outro poller está usando o token. Encerrando.\n`,
          )
          return
        }
        const delay = Math.min(1000 * attempt, 15000)
        const detail = is409
          ? `409 Conflict${attempt === 1 ? ' — outra instância está fazendo polling' : ''}`
          : `erro no polling: ${err}`
        process.stderr.write(`forge channel: ${detail}, tentando novamente em ${delay / 1000}s\n`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  async stop(): Promise<void> {
    await this.bot.stop()
  }
}
