import { join } from 'path'
import { ForgeApp } from './app'

const agentsDir = join(import.meta.dir, '..', 'agents')
const app = new ForgeApp(agentsDir)
await app.start()
