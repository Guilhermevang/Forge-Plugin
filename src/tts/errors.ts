export class TtsError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'TtsError'
  }
}

export class TtsDisabledError extends TtsError {
  constructor() {
    super('TTS desabilitado neste canal (voiceReply=false em access.json).')
    this.name = 'TtsDisabledError'
  }
}

export class TtsBackendMissingError extends TtsError {
  constructor(backend: string, hint: string) {
    super(`Backend TTS "${backend}" indisponível: ${hint}`)
    this.name = 'TtsBackendMissingError'
  }
}
