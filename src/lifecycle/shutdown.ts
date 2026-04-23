import { readFileSync, rmSync } from 'fs'
import type { Config } from '../core/config'

export interface Closeable {
  close(): Promise<void> | void
}

export class ShutdownManager {
  private shuttingDown = false
  private readonly closeables: Closeable[] = []

  constructor(private readonly config: Config | null) {}

  get isShuttingDown(): boolean {
    return this.shuttingDown
  }

  register(c: Closeable): void {
    this.closeables.push(c)
  }

  installSignalHandlers(): void {
    const shutdown = () => this.shutdown()
    process.stdin.on('end', shutdown)
    process.stdin.on('close', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    process.on('SIGHUP', shutdown)
  }

  shutdown(): void {
    if (this.shuttingDown) return
    this.shuttingDown = true
    process.stderr.write('forge channel: desligando\n')

    if (this.config) {
      try {
        if (parseInt(readFileSync(this.config.pidFile, 'utf8'), 10) === process.pid) {
          rmSync(this.config.pidFile)
        }
      } catch {}
    }

    // Hard deadline: 2s para fechar tudo.
    setTimeout(() => process.exit(0), 2000).unref()

    void (async () => {
      for (const c of [...this.closeables].reverse()) {
        try {
          await c.close()
        } catch (err) {
          process.stderr.write(`forge channel: erro ao fechar: ${err}\n`)
        }
      }
      process.exit(0)
    })()
  }
}
