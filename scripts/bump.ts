#!/usr/bin/env bun
// Sincroniza a versão em package.json e .claude-plugin/plugin.json.
// Uso: bun scripts/bump.ts <nova-versao>    ex: bun scripts/bump.ts 1.4.0

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const newVersion = process.argv[2]
if (!newVersion || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
  console.error('uso: bun scripts/bump.ts <major.minor.patch[-pre]>')
  process.exit(1)
}

const root = join(import.meta.dir, '..')
const targets = [join(root, 'package.json'), join(root, '.claude-plugin/plugin.json')]

for (const file of targets) {
  const raw = readFileSync(file, 'utf8')
  const rel = file.replace(root + '/', '')
  // Regex preserva indentação/ordem — evita reserializar o JSON.
  const re = /("version"\s*:\s*)"([^"]+)"/
  const match = raw.match(re)
  if (!match) {
    console.error(`forge bump: campo "version" não encontrado em ${rel}`)
    process.exit(1)
  }
  if (match[2] === newVersion) {
    console.log(`· ${rel} (já em ${newVersion})`)
    continue
  }
  writeFileSync(file, raw.replace(re, `$1"${newVersion}"`))
  console.log(`✓ ${rel}: ${match[2]} → ${newVersion}`)
}

console.log(`\nversão atualizada para ${newVersion}`)
