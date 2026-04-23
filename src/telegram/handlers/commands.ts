import type { Bot } from 'grammy'
import type { Config } from '../../core/config'
import type { AccessStore } from '../../access/store'
import type { ModeStore } from '../../access/mode'

export class CommandHandlers {
  constructor(
    private readonly bot: Bot,
    private readonly config: Config,
    private readonly store: AccessStore,
    private readonly modeStore: ModeStore,
  ) {}

  register(): void {
    this.bot.command('start', async ctx => {
      if (ctx.chat?.type !== 'private') return
      const access = this.store.load()
      if (access.dmPolicy === 'disabled') {
        await ctx.reply('Este bot não está aceitando novas conexões.')
        return
      }
      await ctx.reply(
        `Este bot conecta o Telegram ao Forge — seu time interno de desenvolvimento com Claude.\n\n` +
          `Para parear:\n` +
          `1. Me mande qualquer mensagem — você receberá um código de 6 chars\n` +
          `2. No Claude Code: /forge:access ${this.config.channelName} pair <código>\n\n` +
          `Após parear, suas mensagens viram tarefas para o time (PO → Tech Lead → Developer → QA).`,
      )
    })

    this.bot.command('help', async ctx => {
      if (ctx.chat?.type !== 'private') return
      await ctx.reply(
        `Mensagens que você enviar aqui viram tarefas de desenvolvimento processadas por um time de agentes:\n\n` +
          `🗂 Product Owner — transforma o pedido em requisitos claros\n` +
          `🏗 Tech Lead — define a arquitetura e plano técnico\n` +
          `💻 Developer — implementa o código\n` +
          `✅ QA — revisa e commita\n\n` +
          `/start — instruções de pareamento\n` +
          `/status — verificar seu status\n` +
          `/mode — trocar entre \`edit\` (libera tudo) e \`ask\` (pergunta antes)`,
      )
    })

    this.bot.command('status', async ctx => {
      if (ctx.chat?.type !== 'private') return
      const from = ctx.from
      if (!from) return
      const senderId = String(from.id)
      const access = this.store.load()

      if (access.allowFrom.includes(senderId)) {
        const name = from.username ? `@${from.username}` : senderId
        await ctx.reply(`Pareado como ${name}. Pode mandar suas tarefas!`)
        return
      }

      for (const [code, p] of Object.entries(access.pending)) {
        if (p.senderId === senderId) {
          await ctx.reply(
            `Pareamento pendente — execute no Claude Code:\n\n/forge:access ${this.config.channelName} pair ${code}`,
          )
          return
        }
      }

      await ctx.reply('Não pareado. Me mande uma mensagem para receber o código de pareamento.')
    })

    this.bot.command('mode', async ctx => {
      if (ctx.chat?.type !== 'private') return
      const from = ctx.from
      if (!from) return
      const access = this.store.load()
      if (!access.allowFrom.includes(String(from.id))) {
        await ctx.reply('Você precisa estar pareado para usar /mode.')
        return
      }
      const arg = (ctx.match ?? '').trim().toLowerCase()
      if (!arg) {
        const m = this.modeStore.load()
        const desc =
          m === 'edit'
            ? 'edit — libera tudo (bypassPermissions)'
            : 'ask — pergunta antes de editar/criar'
        await ctx.reply(
          `Modo atual do canal \`${this.config.channelName}\`: ${desc}\n\nTroque com \`/mode edit\` ou \`/mode ask\`. Vale a partir da próxima sessão \`forge ${this.config.channelName}\`.`,
          { parse_mode: 'Markdown' },
        )
        return
      }
      if (arg !== 'edit' && arg !== 'ask') {
        await ctx.reply('Uso: `/mode edit` (libera tudo) ou `/mode ask` (pergunta antes).', {
          parse_mode: 'Markdown',
        })
        return
      }
      this.modeStore.save(arg)
      const desc =
        arg === 'edit'
          ? '✅ Modo: *edit* — libera tudo dentro do projeto.'
          : '✅ Modo: *ask* — pergunta antes de editar/criar.'
      await ctx.reply(
        `${desc}\n\nReabra o Claude com \`forge ${this.config.channelName}\` para o novo modo entrar em vigor (a sessão atual já carregou o modo antigo).`,
        { parse_mode: 'Markdown' },
      )
    })
  }
}
