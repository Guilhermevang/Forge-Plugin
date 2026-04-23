import type { SynthesisInput, SynthesisResult, TtsPort } from '../types'
import { TtsDisabledError } from '../errors'

// Adapter que sempre falha — usado quando o operador seta FORGE_TTS_PROVIDER=none.
// Existe para tornar explícita a desativação em vez de depender de checagens de null.
export class NoopTtsAdapter implements TtsPort {
  readonly defaultVoice = 'none'
  readonly defaultExtension = ''
  readonly defaultMimeType = ''

  async synthesize(_input: SynthesisInput): Promise<SynthesisResult> {
    throw new TtsDisabledError()
  }
}
