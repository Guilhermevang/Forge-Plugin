import { copyFileSync } from 'fs'
import type { SynthesisInput, SynthesisResult, TtsPort } from './types'
import type { FileTtsCache } from './cache'

// Camada que combina um TtsPort com o cache em disco. É o que o tool MCP consome —
// assim o adapter permanece puro (só sabe sintetizar) e o cache permanece isolado.
export class TtsService {
  constructor(
    private readonly adapter: TtsPort,
    private readonly cache: FileTtsCache,
  ) {}

  get defaultVoice(): string {
    return this.adapter.defaultVoice
  }

  async synthesize(input: SynthesisInput): Promise<SynthesisResult> {
    const voice = input.voice ?? this.adapter.defaultVoice
    const key = this.cache.key({
      voice,
      rate: input.rate,
      pitch: input.pitch,
      volume: input.volume,
      text: input.text,
    })
    const extension = '.mp3'

    if (this.cache.has(key, extension)) {
      return {
        filePath: this.cache.path(key, extension),
        mimeType: 'audio/mpeg',
        extension,
      }
    }

    const fresh = await this.adapter.synthesize({ ...input, voice })

    // Só cacheamos mp3 por enquanto — outros formatos seguem direto (sem promoção ao cache).
    if (fresh.extension === extension) {
      const cachedPath = this.cache.path(key, extension)
      try {
        copyFileSync(fresh.filePath, cachedPath)
        this.cache.prune()
        return { ...fresh, filePath: cachedPath }
      } catch {
        return fresh
      }
    }
    return fresh
  }
}
