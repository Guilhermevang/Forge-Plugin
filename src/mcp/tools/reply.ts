import { statSync } from 'fs'
import { extname } from 'path'
import { z } from 'zod'
import { InputFile, type Bot } from 'grammy'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Config } from '../../core/config'
import type { AccessStore } from '../../access/store'
import { assertAllowedChat, assertSendable } from '../../access/assert'
import { chunk } from '../../telegram/chunk'
import { MAX_ATTACHMENT_BYTES, MAX_CHUNK_LIMIT, PHOTO_EXTS } from '../../core/constants'
import type { McpTool } from './deps'

const INPUT_SCHEMA = {
  chat_id: z.string(),
  text: z.string(),
  reply_to: z
    .string()
    .optional()
    .describe('ID da mensagem para fazer thread. Use o message_id do bloco <channel> recebido.'),
  files: z
    .array(z.string())
    .optional()
    .describe(
      'Caminhos absolutos para anexar. Imagens vão como fotos; outros tipos como documentos. Máx 50MB cada.',
    ),
  format: z
    .enum(['text', 'markdownv2'])
    .optional()
    .describe("Modo de renderização. 'markdownv2' habilita formatação Telegram. Default: 'text'."),
} as const

type ReplyArgs = {
  chat_id: string
  text: string
  reply_to?: string
  files?: string[]
  format?: 'text' | 'markdownv2'
}

export class ReplyTool implements McpTool {
  static readonly NAME = 'forge_reply'
  static readonly DESCRIPTION =
    'Envia mensagem ao usuário no Telegram. Passe o chat_id da mensagem recebida. ' +
    'Opcionalmente passe reply_to (message_id) para threading e files (caminhos absolutos) para anexos.'

  constructor(
    private readonly bot: Bot,
    private readonly config: Config,
    private readonly store: AccessStore,
  ) {}

  register(mcp: McpServer): void {
    mcp.registerTool(
      ReplyTool.NAME,
      { description: ReplyTool.DESCRIPTION, inputSchema: INPUT_SCHEMA },
      async args => this.execute(args as ReplyArgs),
    )
  }

  private async execute(args: ReplyArgs) {
    const { chat_id, text } = args
    const reply_to = args.reply_to != null ? Number(args.reply_to) : undefined
    const files = args.files ?? []
    const parseMode = args.format === 'markdownv2' ? ('MarkdownV2' as const) : undefined

    assertAllowedChat(this.store, chat_id)

    for (const f of files) {
      assertSendable(this.config, f)
      const st = statSync(f)
      if (st.size > MAX_ATTACHMENT_BYTES) {
        throw new Error(
          `arquivo muito grande: ${f} (${(st.size / 1024 / 1024).toFixed(1)}MB, máx 50MB)`,
        )
      }
    }

    // Configuração de chunking/reply vem do access.json — permite ajuste por canal.
    const access = this.store.load()
    const limit = Math.max(1, Math.min(access.textChunkLimit ?? MAX_CHUNK_LIMIT, MAX_CHUNK_LIMIT))
    const mode = access.chunkMode ?? 'length'
    const replyMode = access.replyToMode ?? 'first'
    const chunks = chunk(text, limit, mode)
    const sentIds: number[] = []

    try {
      for (let i = 0; i < chunks.length; i++) {
        // Em replyMode='first' só a primeira parte faz thread; 'all' preserva em todas.
        const shouldReplyTo =
          reply_to != null && replyMode !== 'off' && (replyMode === 'all' || i === 0)
        const sent = await this.bot.api.sendMessage(chat_id, chunks[i], {
          ...(shouldReplyTo ? { reply_parameters: { message_id: reply_to } } : {}),
          ...(parseMode ? { parse_mode: parseMode } : {}),
        })
        sentIds.push(sent.message_id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`forge_reply falhou após ${sentIds.length} de ${chunks.length} chunk(s): ${msg}`)
    }

    // Envia anexos após o texto — garante que o chat mostre texto primeiro (context-setting).
    for (const f of files) {
      const ext = extname(f).toLowerCase()
      const input = new InputFile(f)
      const opts =
        reply_to != null && replyMode !== 'off'
          ? { reply_parameters: { message_id: reply_to } }
          : undefined
      if (PHOTO_EXTS.has(ext)) {
        const sent = await this.bot.api.sendPhoto(chat_id, input, opts)
        sentIds.push(sent.message_id)
      } else {
        const sent = await this.bot.api.sendDocument(chat_id, input, opts)
        sentIds.push(sent.message_id)
      }
    }

    const result =
      sentIds.length === 1
        ? `enviado (id: ${sentIds[0]})`
        : `enviado ${sentIds.length} partes (ids: ${sentIds.join(', ')})`
    return { content: [{ type: 'text' as const, text: result }] }
  }
}
