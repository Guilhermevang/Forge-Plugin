import { spawn } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type { SynthesisInput, SynthesisResult, TtsPort } from '../types'
import { TtsBackendMissingError, TtsError } from '../errors'

export type EdgeTtsAdapterOptions = {
  defaultVoice?: string
  bin?: string
  tempDir?: string
}

// Adapter para Microsoft Edge-TTS (Azure Neural voices via o endpoint do browser Edge).
// Zero custo, sem API key. Requer a CLI `edge-tts` (pip install edge-tts).
// Output padrão: MP3 24kHz mono. Enviado via sendAudio (Telegram aceita MP3).
export class EdgeTtsAdapter implements TtsPort {
  readonly defaultVoice: string
  private readonly bin: string
  private readonly tempDir: string
  private backendChecked = false

  constructor(opts: EdgeTtsAdapterOptions = {}) {
    this.defaultVoice = opts.defaultVoice ?? 'pt-BR-FranciscaNeural'
    this.bin = opts.bin ?? 'edge-tts'
    this.tempDir = opts.tempDir ?? join(tmpdir(), 'forge-tts')
    mkdirSync(this.tempDir, { recursive: true, mode: 0o700 })
  }

  async synthesize(input: SynthesisInput): Promise<SynthesisResult> {
    await this.ensureBackend()

    const filePath = join(this.tempDir, `${randomBytes(8).toString('hex')}.mp3`)
    const args = [
      '--voice', input.voice ?? this.defaultVoice,
      '--text', input.text,
      '--write-media', filePath,
    ]
    if (input.rate) args.push('--rate', input.rate)
    if (input.pitch) args.push('--pitch', input.pitch)
    if (input.volume) args.push('--volume', input.volume)

    await this.run(args, 30_000)

    if (!existsSync(filePath)) {
      throw new TtsError(`edge-tts terminou mas não gerou o arquivo: ${filePath}`)
    }
    return { filePath, mimeType: 'audio/mpeg', extension: '.mp3' }
  }

  private async ensureBackend(): Promise<void> {
    if (this.backendChecked) return
    try {
      await this.run(['--help'], 5_000)
      this.backendChecked = true
    } catch (err) {
      throw new TtsBackendMissingError(
        'edge-tts',
        `CLI "${this.bin}" não encontrada ou falhou. Instale com "pipx install edge-tts" (ou "pip install --user edge-tts"). Detalhe: ${(err as Error).message}`,
      )
    }
  }

  private run(args: string[], timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
      let stderr = ''
      const timer = setTimeout(() => {
        proc.kill('SIGKILL')
        reject(new TtsError(`edge-tts excedeu ${timeoutMs}ms`))
      }, timeoutMs)

      proc.stderr?.on('data', chunk => { stderr += chunk.toString() })
      proc.on('error', err => {
        clearTimeout(timer)
        reject(new TtsError(`spawn ${this.bin} falhou: ${err.message}`, err))
      })
      proc.on('close', code => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new TtsError(`${this.bin} saiu com código ${code}: ${stderr.trim() || '(sem stderr)'}`))
      })
    })
  }
}
