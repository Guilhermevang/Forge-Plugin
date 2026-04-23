// Fonte única da versão: package.json. Bun importa JSON em runtime sem config extra.
// plugin.json precisa ser sincronizado por fora (scripts/bump.ts) — Claude Code lê estaticamente.
import pkg from '../../package.json' with { type: 'json' }

export const VERSION: string = pkg.version
