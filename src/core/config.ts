import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
import { homedir } from 'os'
import { join, sep } from 'path'

export type Config = {
  channelName: string
  stateDir: string
  accessFile: string
  approvedDir: string
  envFile: string
  modeFile: string
  inboxDir: string
  pidFile: string
  token: string
  static: boolean
  agentsDir: string
}

export type ConfigResult =
  | { ok: true; config: Config }
  | { ok: false; error: string }

function resolveChannel(): { name: string; stateDir: string } | null {
  const channelsRoot = join(homedir(), '.claude', 'channels')

  if (process.env.FORGE_STATE_DIR) {
    const dir = process.env.FORGE_STATE_DIR
    return { name: dir.split(sep).filter(Boolean).pop() ?? 'forge', stateDir: dir }
  }

  const envChannel = process.env.FORGE_CHANNEL?.trim()
  if (envChannel) return { name: envChannel, stateDir: join(channelsRoot, envChannel) }

  return null
}

function loadEnvFile(envFile: string): void {
  try {
    chmodSync(envFile, 0o600)
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^(\w+)=(.*)$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
    }
  } catch {
    // .env é opcional
  }
}

function replaceStalePoller(pidFile: string): void {
  try {
    const stale = parseInt(readFileSync(pidFile, 'utf8'), 10)
    if (stale > 1 && stale !== process.pid) {
      process.kill(stale, 0)
      process.stderr.write(`forge channel: replacing stale poller pid=${stale}\n`)
      process.kill(stale, 'SIGTERM')
    }
  } catch {
    // não há poller antigo ou já morreu
  }
}

export function loadConfig(agentsDir: string): ConfigResult {
  const resolved = resolveChannel()
  if (!resolved) {
    return {
      ok: false,
      error:
        'Forge sem canal selecionado. Use o launcher `forge <canal>` ou defina FORGE_CHANNEL=<canal>. ' +
        'Se ainda não criou um canal, rode /forge:configure <nome> <token>.',
    }
  }

  const stateDir = resolved.stateDir
  const envFile = join(stateDir, '.env')
  loadEnvFile(envFile)

  const token = process.env.FORGE_BOT_TOKEN
  if (!token) {
    return {
      ok: false,
      error:
        `Forge canal "${resolved.name}" sem FORGE_BOT_TOKEN. ` +
        `Defina em ${envFile} (formato: FORGE_BOT_TOKEN=123456789:AAH...).`,
    }
  }

  const pidFile = join(stateDir, 'bot.pid')

  mkdirSync(stateDir, { recursive: true, mode: 0o700 })
  process.stderr.write(`forge channel: canal "${resolved.name}" — state dir = ${stateDir}\n`)
  replaceStalePoller(pidFile)
  writeFileSync(pidFile, String(process.pid))

  return {
    ok: true,
    config: {
      channelName: resolved.name,
      stateDir,
      accessFile: join(stateDir, 'access.json'),
      approvedDir: join(stateDir, 'approved'),
      envFile,
      modeFile: join(stateDir, 'mode'),
      inboxDir: join(stateDir, 'inbox'),
      pidFile,
      token,
      static: process.env.FORGE_ACCESS_MODE === 'static',
      agentsDir,
    },
  }
}
