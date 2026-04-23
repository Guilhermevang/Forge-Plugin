// Contrato (port) dos adapters de TTS. O Forge só conversa com essa interface —
// trocar Edge-TTS por Kokoro/Piper/Chatterbox é só escrever um novo adapter.

export type TtsProvider = 'edge' | 'piper' | 'none'

export type SynthesisInput = {
  text: string
  voice?: string
  rate?: string
  pitch?: string
  volume?: string
  // Override do provider em tempo de chamada. Quando ausente, cai no default do service.
  provider?: TtsProvider
}

export type SynthesisResult = {
  filePath: string
  mimeType: string
  extension: string
}

export interface TtsPort {
  readonly defaultVoice: string
  // Extensão que o adapter produz em caso normal (ex: ".mp3", ".wav", ".ogg").
  // Usada pelo cache para nomear o arquivo — cada provider tem formato próprio.
  readonly defaultExtension: string
  readonly defaultMimeType: string
  synthesize(input: SynthesisInput): Promise<SynthesisResult>
}
