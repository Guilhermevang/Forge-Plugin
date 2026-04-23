import type { ShutdownManager } from './shutdown'

export class OrphanWatchdog {
  private readonly bootPpid: number
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly shutdownManager: ShutdownManager) {
    this.bootPpid = process.ppid
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 5000)
    this.timer.unref()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private tick(): void {
    const orphaned =
      (process.platform !== 'win32' && process.ppid !== this.bootPpid) ||
      process.stdin.destroyed ||
      process.stdin.readableEnded
    if (orphaned) this.shutdownManager.shutdown()
  }
}
