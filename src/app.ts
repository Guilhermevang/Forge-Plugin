import type { Config } from './core/config'
import { loadConfig } from './core/config'
import { AccessStore } from './access/store'
import { ModeStore } from './access/mode'
import { TelegramBot } from './telegram/bot'
import { ApprovalsWatcher } from './telegram/approvals'
import { TelegramHandlers } from './telegram/handlers'
import { ToolRegistry } from './mcp/tools'
import { PermissionBroker } from './mcp/permissions'
import { ForgeMcpServer } from './mcp/server'
import { ShutdownManager } from './lifecycle/shutdown'
import { OrphanWatchdog } from './lifecycle/watchdog'

export class ForgeApp {
  private readonly shutdownManager: ShutdownManager
  private readonly watchdog: OrphanWatchdog
  private readonly mcpServer: ForgeMcpServer
  private readonly config: Config | null
  private readonly configError: string | null
  private readonly bot: TelegramBot | null = null
  private readonly approvals: ApprovalsWatcher | null = null

  constructor(agentsDir: string) {
    this.installProcessErrorHandlers()

    const result = loadConfig(agentsDir)
    if (!result.ok) {
      process.stderr.write(`forge channel: ${result.error}\n`)
      this.config = null
      this.configError = result.error
      this.shutdownManager = new ShutdownManager(null)
      this.watchdog = new OrphanWatchdog(this.shutdownManager)
      this.mcpServer = new ForgeMcpServer({
        agentsDir,
        configError: this.configError,
        registry: null,
      })
      return
    }

    this.config = result.config
    this.configError = null
    this.shutdownManager = new ShutdownManager(this.config)

    this.bot = new TelegramBot(this.config.token, () => this.shutdownManager.isShuttingDown)
    const store = new AccessStore(this.config)
    const modeStore = new ModeStore(this.config)
    const registry = new ToolRegistry(this.bot.bot, this.config, store)

    this.mcpServer = new ForgeMcpServer({
      agentsDir,
      configError: null,
      registry,
    })

    // PermissionBroker precisa do McpServer (high-level) para acessar o Server subjacente.
    const permissionBroker = new PermissionBroker(this.mcpServer.mcp, this.bot.bot, store)
    permissionBroker.register()

    const handlers = new TelegramHandlers({
      bot: this.bot.bot,
      config: this.config,
      store,
      modeStore,
      getBotUsername: () => this.bot!.username,
      notify: (method, params) => this.mcpServer.notify(method, params),
      pendingPermissions: permissionBroker.pending,
    })
    handlers.register()

    this.approvals = new ApprovalsWatcher(this.config, this.bot.bot)
    this.watchdog = new OrphanWatchdog(this.shutdownManager)

    this.shutdownManager.register({ close: () => this.bot!.stop() })
    this.shutdownManager.register({ close: () => this.approvals!.stop() })
    this.shutdownManager.register({ close: () => this.watchdog.stop() })
    this.shutdownManager.register({ close: () => this.mcpServer.close() })
  }

  async start(): Promise<void> {
    await this.mcpServer.connect()

    this.shutdownManager.installSignalHandlers()
    this.watchdog.start()

    if (this.configError || !this.bot || !this.config) {
      process.stderr.write(
        'forge channel: rodando sem canal/token — MCP responde com instruções, bot desativado.\n',
      )
      return
    }

    this.approvals!.start()
    void this.bot.start()
  }

  private installProcessErrorHandlers(): void {
    process.on('unhandledRejection', err => {
      process.stderr.write(`forge channel: unhandled rejection: ${err}\n`)
    })
    process.on('uncaughtException', err => {
      process.stderr.write(`forge channel: uncaught exception: ${err}\n`)
    })
  }
}
