import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import type { Config } from '../core/config'
import type { ChannelMode } from '../core/types'

export class ModeStore {
  constructor(private readonly config: Config) {}

  load(): ChannelMode {
    try {
      const raw = readFileSync(this.config.modeFile, 'utf8').trim().toLowerCase()
      if (raw === 'edit') return 'edit'
    } catch {}
    return 'ask'
  }

  save(m: ChannelMode): void {
    mkdirSync(this.config.stateDir, { recursive: true, mode: 0o700 })
    const tmp = this.config.modeFile + '.tmp'
    writeFileSync(tmp, m + '\n', { mode: 0o600 })
    renameSync(tmp, this.config.modeFile)
  }
}
