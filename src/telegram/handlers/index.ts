import type { Bot } from 'grammy'
import type { Config } from '../../core/config'
import type { AccessStore } from '../../access/store'
import type { ModeStore } from '../../access/mode'
import type { PermissionRequest } from '../../core/types'
import { CommandHandlers } from './commands'
import { CallbackHandlers } from './callbacks'
import { MessageRouter } from './messages'
import type { NotifyFn } from './deps'

export type { NotifyFn } from './deps'

export type TelegramHandlersOptions = {
  bot: Bot
  config: Config
  store: AccessStore
  modeStore: ModeStore
  getBotUsername: () => string
  notify: NotifyFn
  pendingPermissions: Map<string, PermissionRequest>
}

// Agrega os três grupos de handlers do bot (slash commands, callbacks de botão, mensagens).
export class TelegramHandlers {
  private readonly commands: CommandHandlers
  private readonly callbacks: CallbackHandlers
  private readonly messages: MessageRouter

  constructor(opts: TelegramHandlersOptions) {
    this.commands = new CommandHandlers(opts.bot, opts.config, opts.store, opts.modeStore)
    this.callbacks = new CallbackHandlers(opts.bot, opts.store, opts.notify, opts.pendingPermissions)
    this.messages = new MessageRouter({
      bot: opts.bot,
      config: opts.config,
      store: opts.store,
      getBotUsername: opts.getBotUsername,
      notify: opts.notify,
    })
  }

  register(): void {
    this.commands.register()
    this.callbacks.register()
    this.messages.register()
  }
}
