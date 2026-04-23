import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import type { Config } from '../core/config'
import type { Access } from '../core/types'

export function defaultAccess(): Access {
  return {
    dmPolicy: 'pairing',
    allowFrom: [],
    groups: {},
    pending: {},
  }
}

export class AccessStore {
  private readonly bootAccess: Access | null

  constructor(private readonly config: Config) {
    this.bootAccess = config.static ? this.snapshotForStatic() : null
  }

  load(): Access {
    return this.bootAccess ?? this.readFromDisk()
  }

  save(a: Access): void {
    if (this.config.static) return
    mkdirSync(this.config.stateDir, { recursive: true, mode: 0o700 })
    const tmp = this.config.accessFile + '.tmp'
    writeFileSync(tmp, JSON.stringify(a, null, 2) + '\n', { mode: 0o600 })
    renameSync(tmp, this.config.accessFile)
  }

  private snapshotForStatic(): Access {
    const a = this.readFromDisk()
    if (a.dmPolicy === 'pairing') {
      process.stderr.write(
        'forge channel: static mode — dmPolicy "pairing" rebaixado para "allowlist"\n',
      )
      a.dmPolicy = 'allowlist'
    }
    a.pending = {}
    return a
  }

  private readFromDisk(): Access {
    try {
      const raw = readFileSync(this.config.accessFile, 'utf8')
      const parsed = JSON.parse(raw) as Partial<Access>
      return {
        dmPolicy: parsed.dmPolicy ?? 'pairing',
        allowFrom: parsed.allowFrom ?? [],
        groups: parsed.groups ?? {},
        pending: parsed.pending ?? {},
        mentionPatterns: parsed.mentionPatterns,
        ackReaction: parsed.ackReaction,
        replyToMode: parsed.replyToMode,
        textChunkLimit: parsed.textChunkLimit,
        chunkMode: parsed.chunkMode,
        voiceReply: parsed.voiceReply,
        voiceName: parsed.voiceName,
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return defaultAccess()
      try {
        renameSync(this.config.accessFile, `${this.config.accessFile}.corrupt-${Date.now()}`)
      } catch {}
      process.stderr.write(`forge channel: access.json corrompido, movido. Reiniciando do zero.\n`)
      return defaultAccess()
    }
  }
}
