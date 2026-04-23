import { realpathSync } from 'fs'
import { join, sep } from 'path'
import type { Config } from '../core/config'
import { SecurityError } from '../core/errors'
import type { AccessStore } from './store'

export function assertAllowedChat(store: AccessStore, chat_id: string): void {
  const access = store.load()
  if (access.allowFrom.includes(chat_id)) return
  if (chat_id in access.groups) return
  throw new SecurityError(`chat ${chat_id} não está na allowlist — adicione via /forge:access`)
}

export function assertSendable(config: Config, f: string): void {
  let real: string, stateReal: string
  try {
    real = realpathSync(f)
    stateReal = realpathSync(config.stateDir)
  } catch {
    return
  }
  const inbox = join(stateReal, 'inbox')
  if (real.startsWith(stateReal + sep) && !real.startsWith(inbox + sep)) {
    throw new SecurityError(`refusing to send channel state: ${f}`)
  }
}
