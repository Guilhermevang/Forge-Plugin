import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import type { Bot } from 'grammy'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Config } from '../../core/config'
import type { McpTool } from './deps'

const INPUT_SCHEMA = {
  file_id: z.string().describe('O attachment_file_id da mensagem recebida'),
} as const

type DownloadArgs = { file_id: string }

export class DownloadTool implements McpTool {
  static readonly NAME = 'forge_download_attachment'
  static readonly DESCRIPTION =
    'Baixa um anexo do Telegram para o inbox local. Use quando o <channel> tiver attachment_file_id. Retorna o caminho do arquivo local. Telegram limita downloads a 20MB.'

  constructor(
    private readonly bot: Bot,
    private readonly config: Config,
  ) {}

  register(mcp: McpServer): void {
    mcp.registerTool(
      DownloadTool.NAME,
      { description: DownloadTool.DESCRIPTION, inputSchema: INPUT_SCHEMA },
      async args => this.execute(args as DownloadArgs),
    )
  }

  private async execute(args: DownloadArgs) {
    const file = await this.bot.api.getFile(args.file_id)
    if (!file.file_path) throw new Error('Telegram não retornou file_path — arquivo pode ter expirado')
    const url = `https://api.telegram.org/file/bot${this.config.token}/${file.file_path}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`download falhou: HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    // Sanitiza nome/ext para evitar path traversal e caracteres exóticos no FS.
    const rawExt = file.file_path.includes('.') ? file.file_path.split('.').pop()! : 'bin'
    const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '') || 'bin'
    const uniqueId = (file.file_unique_id ?? '').replace(/[^a-zA-Z0-9_-]/g, '') || 'dl'
    const path = join(this.config.inboxDir, `${Date.now()}-${uniqueId}.${ext}`)
    mkdirSync(this.config.inboxDir, { recursive: true })
    writeFileSync(path, buf)
    return { content: [{ type: 'text' as const, text: path }] }
  }
}
