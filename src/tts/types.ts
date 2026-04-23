// Contrato (port) dos adapters de TTS. O Forge só conversa com essa interface —
// trocar Edge-TTS por Kokoro/Piper/Chatterbox é só escrever um novo adapter.

export type SynthesisInput = {
  text: string
  voice?: string
  rate?: string
  pitch?: string
  volume?: string
}

export type SynthesisResult = {
  filePath: string
  mimeType: string
  extension: string
}

export interface TtsPort {
  readonly defaultVoice: string
  synthesize(input: SynthesisInput): Promise<SynthesisResult>
}
