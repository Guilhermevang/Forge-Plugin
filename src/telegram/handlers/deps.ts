import type { Bot } from 'grammy'
import type { Config } from '../../core/config'
import type { AccessStore } from '../../access/store'
import type { ModeStore } from '../../access/mode'
import type { PermissionRequest } from '../../core/types'

export type NotifyFn = (method: string, params: unknown) => void

export type HandlerDeps = {
  bot: Bot
  config: Config
  store: AccessStore
  modeStore: ModeStore
  getBotUsername: () => string
  notify: NotifyFn
  pendingPermissions: Map<string, PermissionRequest>
}
