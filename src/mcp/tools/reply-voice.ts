import { z } from 'zod'
import { InputFile, type Bot } from 'grammy'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AccessStore } from '../../access/store'
import { assertAllowedChat } from '../../access/assert'
import type { TtsService } from '../../tts'
import { TtsError } from '../../tts'
import type { McpTool } from './deps'

const INPUT_SCHEMA = {
  chat_id: z.string(),
  text: z
    .string()
    .describe(
      'Texto a ser sintetizado. Use 1–2 parágrafos de narrativa falada. NÃO inclua markdown, bullets, blocos de código, caminhos de arquivo, hash de commit ou jargão não-pronunciável.',
    ),
  reply_to: z
    .string()
    .optional()
    .describe('message_id para fazer thread (normalmente o mesmo do forge_reply anterior).'),
  voice: z
    .string()
    .optional()
    .describe(
      'Override da voz. Default: access.voiceName ou FORGE_TTS_VOICE. Exemplos pt-BR: pt-BR-FranciscaNeural, pt-BR-AntonioNeural.',
    ),
  rate: z
    .string()
    .optional()
    .describe('Ajuste de velocidade, ex: "+0%", "-10%", "+20%".'),
} as const

type ReplyVoiceArgs = {
  chat_id: string
  text: string
  reply_to?: string
  voice?: string
  rate?: string
}

export class ReplyVoiceTool implements McpTool {
  static readonly NAME = 'forge_reply_voice'
  static readonly DESCRIPTION =
    'Envia áudio sintetizado (TTS) ao usuário — versão humanizada/conversacional de uma entrega, complemento do forge_reply. ' +
    'Passe só texto falado. Se voiceReply=false no canal, a chamada é ignorada silenciosamente.'

  constructor(
    private readonly bot: Bot,
    private readonly store: AccessStore,
    private readonly tts: TtsService,
  ) {}

  register(mcp: McpServer): void {
    mcp.registerTool(
      ReplyVoiceTool.NAME,
      { description: ReplyVoiceTool.DESCRIPTION, inputSchema: INPUT_SCHEMA },
      async args => this.execute(args as ReplyVoiceArgs),
    )
  }

  private async execute(args: ReplyVoiceArgs) {
    assertAllowedChat(this.store, args.chat_id)

    const access = this.store.load()
    // Default = habilitado. Só desliga se o operador setar explicitamente voiceReply=false.
    if (access.voiceReply === false) {
      return {
        content: [
          { type: 'text' as const, text: 'voice desabilitado neste canal (voiceReply=false), pulado' },
        ],
      }
    }

    const text = args.text.trim()
    if (!text) throw new Error('forge_reply_voice: texto vazio')

    // Precedência da voz: argumento do agente → override do canal → default do service.
    const voice = args.voice ?? access.voiceName ?? undefined

    let result
    try {
      result = await this.tts.synthesize({ text, voice, rate: args.rate })
    } catch (err) {
      const msg = err instanceof TtsError ? err.message : (err as Error).message
      throw new Error(`forge_reply_voice: falha ao sintetizar: ${msg}`)
    }

    const reply_to = args.reply_to != null ? Number(args.reply_to) : undefined
    const replyMode = access.replyToMode ?? 'first'
    const opts =
      reply_to != null && replyMode !== 'off'
        ? { reply_parameters: { message_id: reply_to } }
        : undefined

    const sent = await this.bot.api.sendAudio(args.chat_id, new InputFile(result.filePath), opts)
    return {
      content: [{ type: 'text' as const, text: `áudio enviado (id: ${sent.message_id})` }],
    }
  }
}
