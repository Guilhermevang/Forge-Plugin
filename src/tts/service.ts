import { copyFileSync } from 'fs'
import type { SynthesisInput, SynthesisResult, TtsPort, TtsProvider } from './types'
import { TtsError } from './errors'
import type { FileTtsCache } from './cache'

// Camada que combina adapters com o cache em disco. Mantém um registry de adapters
// por provider — assim `access.voiceProvider` pode sobrescrever o default em cada
// chamada sem recriar adapters (Edge e Piper convivem em paralelo no mesmo processo).
export class TtsService {
  constructor(
    private readonly adapters: Map<TtsProvider, TtsPort>,
    private readonly defaultProvider: TtsProvider,
    private readonly cache: FileTtsCache,
  ) {}

  get defaultVoice(): string {
    return this.defaultAdapter().defaultVoice
  }

  get activeProvider(): TtsProvider {
    return this.defaultProvider
  }

  availableProviders(): TtsProvider[] {
    return Array.from(this.adapters.keys())
  }

  async synthesize(input: SynthesisInput): Promise<SynthesisResult> {
    const providerName = input.provider ?? this.defaultProvider
    const adapter = this.adapters.get(providerName)
    if (!adapter) {
      throw new TtsError(
        `provider TTS "${providerName}" não configurado. Disponíveis: ${this.availableProviders().join(', ') || '(nenhum)'}.`,
      )
    }

    const voice = input.voice ?? adapter.defaultVoice
    const extension = adapter.defaultExtension
    const key = this.cache.key({
      provider: providerName,
      voice,
      rate: input.rate,
      pitch: input.pitch,
      volume: input.volume,
      text: input.text,
    })

    if (extension && this.cache.has(key, extension)) {
      return {
        filePath: this.cache.path(key, extension),
        mimeType: adapter.defaultMimeType,
        extension,
      }
    }

    const fresh = await adapter.synthesize({ ...input, voice })

    // Cacheia quando o adapter devolve a extensão default — outros casos seguem direto.
    if (extension && fresh.extension === extension) {
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

  private defaultAdapter(): TtsPort {
    const a = this.adapters.get(this.defaultProvider)
    if (!a) throw new TtsError(`default provider "${this.defaultProvider}" sem adapter registrado`)
    return a
  }
}
