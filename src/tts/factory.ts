import { join } from 'path'
import type { Config } from '../core/config'
import { EdgeTtsAdapter } from './adapters/edge'
import { NoopTtsAdapter } from './adapters/noop'
import { FileTtsCache } from './cache'
import type { TtsPort } from './types'
import { TtsService } from './service'

export type TtsProvider = 'edge' | 'none'

// Escolhe o adapter via FORGE_TTS_PROVIDER (default: edge). Voz padrão via FORGE_TTS_VOICE.
// Cache em <stateDir>/tts-cache — isolado por canal.
export function createTtsService(config: Config): TtsService {
  const provider = resolveProvider()
  const adapter = buildAdapter(provider)
  const cache = new FileTtsCache(join(config.stateDir, 'tts-cache'))
  process.stderr.write(`forge channel: TTS provider="${provider}" voice="${adapter.defaultVoice}"\n`)
  return new TtsService(adapter, cache)
}

function resolveProvider(): TtsProvider {
  const raw = (process.env.FORGE_TTS_PROVIDER ?? 'edge').toLowerCase()
  if (raw === 'edge' || raw === 'none') return raw
  process.stderr.write(`forge channel: FORGE_TTS_PROVIDER="${raw}" desconhecido, caindo para "edge"\n`)
  return 'edge'
}

function buildAdapter(provider: TtsProvider): TtsPort {
  switch (provider) {
    case 'edge':
      return new EdgeTtsAdapter({
        defaultVoice: process.env.FORGE_TTS_VOICE ?? 'pt-BR-FranciscaNeural',
      })
    case 'none':
      return new NoopTtsAdapter()
  }
}
