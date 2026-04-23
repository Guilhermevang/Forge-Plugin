import { spawn } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { homedir, tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type { SynthesisInput, SynthesisResult, TtsPort } from '../types'
import { TtsBackendMissingError, TtsError } from '../errors'

export type PiperTtsAdapterOptions = {
  defaultVoice?: string
  modelsDir?: string
  bin?: string
  format?: 'wav' | 'ogg'
  ffmpegBin?: string
  tempDir?: string
}

// Adapter para Piper TTS (https://github.com/rhasspy/piper).
// Neural offline, sem API key, roda em CPU. Cada "voz" é um modelo .onnx baixado
// localmente — formato de arquivo: <modelsDir>/<voice>.onnx + .onnx.json sidecar.
// Saída nativa é WAV; se format='ogg' e ffmpeg disponível, converte para OGG/Opus
// (voice note nativo do Telegram).
export class PiperTtsAdapter implements TtsPort {
  readonly defaultVoice: string
  readonly defaultExtension: string
  readonly defaultMimeType: string

  private readonly bin: string
  private readonly ffmpegBin: string
  private readonly modelsDir: string
  private readonly format: 'wav' | 'ogg'
  private readonly tempDir: string
  private backendChecked = false

  constructor(opts: PiperTtsAdapterOptions = {}) {
    this.defaultVoice = opts.defaultVoice ?? 'pt_BR-faber-medium'
    this.bin = opts.bin ?? 'piper'
    this.ffmpegBin = opts.ffmpegBin ?? 'ffmpeg'
    this.modelsDir = opts.modelsDir ?? join(homedir(), '.local', 'share', 'piper-voices')
    this.format = opts.format ?? 'wav'
    this.defaultExtension = this.format === 'ogg' ? '.ogg' : '.wav'
    this.defaultMimeType = this.format === 'ogg' ? 'audio/ogg' : 'audio/wav'
    this.tempDir = opts.tempDir ?? join(tmpdir(), 'forge-tts')
    mkdirSync(this.tempDir, { recursive: true, mode: 0o700 })
  }

  async synthesize(input: SynthesisInput): Promise<SynthesisResult> {
    await this.ensureBackend()

    const voice = input.voice ?? this.defaultVoice
    const modelPath = this.resolveModelPath(voice)
    if (!existsSync(modelPath)) {
      throw new TtsBackendMissingError(
        'piper',
        `modelo "${voice}" não encontrado em ${modelPath}. Baixe pela skill /forge:voice ou de https://huggingface.co/rhasspy/piper-voices.`,
      )
    }

    const wavPath = join(this.tempDir, `${randomBytes(8).toString('hex')}.wav`)
    await this.runPiper(modelPath, input.text, wavPath)

    if (!existsSync(wavPath)) {
      throw new TtsError(`piper terminou mas não gerou o arquivo: ${wavPath}`)
    }

    if (this.format === 'wav') {
      return { filePath: wavPath, mimeType: 'audio/wav', extension: '.wav' }
    }

    const oggPath = wavPath.replace(/\.wav$/, '.ogg')
    await this.convertToOgg(wavPath, oggPath)
    return { filePath: oggPath, mimeType: 'audio/ogg', extension: '.ogg' }
  }

  private resolveModelPath(voice: string): string {
    // Aceita tanto nome curto ("pt_BR-faber-medium") quanto caminho absoluto pro .onnx.
    if (voice.endsWith('.onnx') || voice.includes('/')) return voice
    return join(this.modelsDir, `${voice}.onnx`)
  }

  private async ensureBackend(): Promise<void> {
    if (this.backendChecked) return
    try {
      await this.runProcess(this.bin, ['--help'], 5_000)
    } catch (err) {
      throw new TtsBackendMissingError(
        'piper',
        `CLI "${this.bin}" não encontrada. Instale com "pipx install piper-tts". Detalhe: ${(err as Error).message}`,
      )
    }
    if (this.format === 'ogg') {
      try {
        await this.runProcess(this.ffmpegBin, ['-version'], 5_000)
      } catch (err) {
        throw new TtsBackendMissingError(
          'piper (ogg)',
          `formato ogg requer ffmpeg no PATH. Instale ffmpeg ou use FORGE_TTS_PIPER_FORMAT=wav. Detalhe: ${(err as Error).message}`,
        )
      }
    }
    this.backendChecked = true
  }

  private runPiper(modelPath: string, text: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.bin, ['--model', modelPath, '--output_file', outPath], {
        stdio: ['pipe', 'ignore', 'pipe'],
      })
      let stderr = ''
      const timer = setTimeout(() => {
        proc.kill('SIGKILL')
        reject(new TtsError(`piper excedeu 60000ms`))
      }, 60_000)

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
      proc.stdin?.end(text)
    })
  }

  private convertToOgg(wavPath: string, oggPath: string): Promise<void> {
    // OGG/Opus 24kHz mono — formato que o Telegram aceita como voice note nativo.
    const args = [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', wavPath,
      '-c:a', 'libopus', '-b:a', '32k', '-ar', '24000', '-ac', '1',
      oggPath,
    ]
    return this.runProcess(this.ffmpegBin, args, 30_000)
  }

  private runProcess(bin: string, args: string[], timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
      let stderr = ''
      const timer = setTimeout(() => {
        proc.kill('SIGKILL')
        reject(new TtsError(`${bin} excedeu ${timeoutMs}ms`))
      }, timeoutMs)

      proc.stderr?.on('data', chunk => { stderr += chunk.toString() })
      proc.on('error', err => {
        clearTimeout(timer)
        reject(new TtsError(`spawn ${bin} falhou: ${err.message}`, err))
      })
      proc.on('close', code => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new TtsError(`${bin} saiu com código ${code}: ${stderr.trim() || '(sem stderr)'}`))
      })
    })
  }
}
