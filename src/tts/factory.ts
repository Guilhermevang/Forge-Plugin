import { join } from 'path'
import type { Config } from '../core/config'
import { EdgeTtsAdapter } from './adapters/edge'
import { NoopTtsAdapter } from './adapters/noop'
import { PiperTtsAdapter } from './adapters/piper'
import { FileTtsCache } from './cache'
import type { TtsPort, TtsProvider } from './types'
import { TtsService } from './service'

// Monta o registry de adapters disponíveis no processo. Edge e Noop são sempre
// registrados (custo zero de construção); Piper entra no registry incondicionalmente
// mas só valida backend/modelo quando é efetivamente usado (ensureBackend lazy).
// FORGE_TTS_PROVIDER escolhe o default; access.voiceProvider sobrescreve por canal.
export function createTtsService(config: Config): TtsService {
  const defaultProvider = resolveProvider()
  const adapters = new Map<TtsProvider, TtsPort>()
  adapters.set('edge', buildEdgeAdapter())
  adapters.set('piper', buildPiperAdapter())
  adapters.set('none', new NoopTtsAdapter())

  const cache = new FileTtsCache(join(config.stateDir, 'tts-cache'))
  const defaultAdapter = adapters.get(defaultProvider)!
  process.stderr.write(
    `forge channel: TTS default="${defaultProvider}" voice="${defaultAdapter.defaultVoice}"\n`,
  )
  return new TtsService(adapters, defaultProvider, cache)
}

function resolveProvider(): TtsProvider {
  const raw = (process.env.FORGE_TTS_PROVIDER ?? 'edge').toLowerCase()
  if (raw === 'edge' || raw === 'piper' || raw === 'none') return raw
  process.stderr.write(`forge channel: FORGE_TTS_PROVIDER="${raw}" desconhecido, caindo para "edge"\n`)
  return 'edge'
}

function buildEdgeAdapter(): TtsPort {
  return new EdgeTtsAdapter({
    defaultVoice: process.env.FORGE_TTS_EDGE_VOICE ?? process.env.FORGE_TTS_VOICE ?? 'pt-BR-FranciscaNeural',
  })
}

function buildPiperAdapter(): TtsPort {
  const format = (process.env.FORGE_TTS_PIPER_FORMAT ?? 'wav').toLowerCase()
  return new PiperTtsAdapter({
    defaultVoice: process.env.FORGE_TTS_PIPER_VOICE ?? 'pt_BR-faber-medium',
    modelsDir: process.env.FORGE_TTS_PIPER_MODELS_DIR,
    format: format === 'ogg' ? 'ogg' : 'wav',
  })
}
