export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecurityError'
  }
}
