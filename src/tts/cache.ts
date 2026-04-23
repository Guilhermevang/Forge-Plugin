import { createHash } from 'crypto'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

// Cache em disco para áudios sintetizados. Chave = hash determinístico das
// variáveis de síntese (voz + rate + pitch + volume + texto). Evita regenerar
// o mesmo áudio em re-envios e reduz latência.

export class FileTtsCache {
  constructor(
    private readonly cacheDir: string,
    private readonly maxEntries = 500,
  ) {
    mkdirSync(cacheDir, { recursive: true, mode: 0o700 })
  }

  key(parts: Record<string, string | undefined>): string {
    const canonical = Object.keys(parts)
      .sort()
      .map(k => `${k}=${parts[k] ?? ''}`)
      .join('|')
    return createHash('sha256').update(canonical).digest('hex').slice(0, 32)
  }

  path(key: string, extension: string): string {
    return join(this.cacheDir, `${key}${extension}`)
  }

  has(key: string, extension: string): boolean {
    return existsSync(this.path(key, extension))
  }

  // Política LRU simples: remove os mais antigos quando passa do teto.
  prune(): void {
    try {
      const files = readdirSync(this.cacheDir).map(name => {
        const full = join(this.cacheDir, name)
        return { full, mtime: statSync(full).mtimeMs }
      })
      if (files.length <= this.maxEntries) return
      files.sort((a, b) => a.mtime - b.mtime)
      for (const f of files.slice(0, files.length - this.maxEntries)) {
        try { unlinkSync(f.full) } catch {}
      }
    } catch {
      // Cache corrompido não deve derrubar envio de mensagem.
    }
  }
}
