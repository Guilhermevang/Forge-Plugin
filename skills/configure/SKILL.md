---
name: configure
description: Configura canais Forge — cria novos canais com token do BotFather, registra no MCP e mostra status. Use quando o usuário colar um token, pedir para configurar o Forge, listar canais existentes, ou verificar o status de um canal.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(find *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(claude mcp *)
  - Bash(python3 *)
---

# /forge:configure — Configuração de Canais Forge

Cada canal Forge é um bot Telegram independente. O estado de cada canal fica em `~/.claude/channels/<nome>/`. O servidor MCP é registrado globalmente via `claude mcp add --scope user`.

Argumentos recebidos: `$ARGUMENTS`

---

## Localizar o server.ts do Forge

Antes de registrar qualquer canal, você precisa do caminho absoluto do `server.ts`. Tente nesta ordem:

1. `python3 -c "import json; d=json.load(open('/home/$(whoami)/.claude.json')); servers=d.get('mcpServers',{}); forge=[v['args'][0] for k,v in servers.items() if k.startswith('forge-') and 'args' in v]; print(forge[0] if forge else '')"` — extrai de um servidor já registrado.
2. Se vazio, `find ~/.claude/plugins/cache -name "server.ts" -path "*/forge/*" 2>/dev/null | head -1`
3. Se ainda vazio, informe o usuário que o plugin não foi encontrado e peça para reinstalar via `/plugins`.

Guarde como `SERVER_PATH`.

---

## Dispatch por argumentos

Parse `$ARGUMENTS` (trim whitespace).

### Sem argumentos — status geral

1. Execute `claude mcp list 2>/dev/null` e filtre linhas com `forge-` para listar canais ativos.
2. Para cada canal `forge-<nome>`, determine o `FORGE_STATE_DIR` lendo `~/.claude.json`:
   `python3 -c "import json; d=json.load(open('/home/$(whoami)/.claude.json')); [print(k, v.get('env',{}).get('FORGE_STATE_DIR','')) for k,v in d.get('mcpServers',{}).items() if k.startswith('forge-')]"`
3. Para cada canal, leia o `.env` e o `access.json` no `FORGE_STATE_DIR`.
4. Exiba uma tabela: **Canal**, **Token** (primeiros 10 chars mascarados), **Política**, **Permitidos**.
5. Se nenhum canal, mostre orientação:
   > *"Nenhum canal configurado. Execute `/forge:configure <nome> <token>` para criar o primeiro."*
6. Conduza a conversa (veja seção abaixo).

---

### `<nome> <token>` — criar ou atualizar canal

`<nome>` é o identificador do canal (ex: `dropflux-backend`, `frontend`, `mobile`).
`<token>` é o token do BotFather (formato `123456789:AAH...`).

1. Valide que `<token>` contém `:`. Se não, avise e pare.
2. `mkdir -p ~/.claude/channels/<nome>`
3. Leia o `.env` existente em `~/.claude/channels/<nome>/.env` se houver; atualize/adicione a linha `FORGE_BOT_TOKEN=<token>`, preserve outras chaves. Escreva de volta sem aspas.
4. `chmod 600 ~/.claude/channels/<nome>/.env`
5. Localize `SERVER_PATH` (veja seção acima).
6. **Registrar o servidor MCP:**
   ```bash
   claude mcp add -e FORGE_STATE_DIR=/home/<user>/.claude/channels/<nome> --scope user forge-<nome> -- bun <SERVER_PATH>
   ```
   Use o caminho absoluto expandido (nunca `~`). Se o servidor já existir, o `claude mcp add` vai sobrescrever — isso é ok.
7. Confirme: *"Canal `<nome>` registrado. Reinicie o Claude Code para ativar o servidor."*
8. Mostre o status do canal (token, política, permitidos).
9. Conduza a conversa (veja abaixo).

---

### `<nome>` — status de um canal específico

1. Verifique se `forge-<nome>` existe nos servidores MCP (via `claude mcp list`).
2. Leia `~/.claude/channels/<nome>/.env` e `~/.claude/channels/<nome>/access.json`.
3. Mostre: token (mascarado), política, permitidos, pendentes.
4. Conduza a conversa (veja abaixo).

---

### `<nome> clear` — remover canal

1. Delete a linha `FORGE_BOT_TOKEN=` do `.env` (ou o arquivo todo se for a única linha).
2. Execute `claude mcp remove forge-<nome> --scope user`.
3. Confirme e avise que é necessário reiniciar o Claude Code.

---

## Condução da conversa

Após mostrar o status de qualquer canal, empurre sempre para o lockdown:

1. **Sem token** → *"Execute `/forge:configure <nome> <token>` com o token do BotFather."*
2. **Token configurado, política `pairing`, ninguém permitido** → *"Mande uma DM pro seu bot no Telegram. Ele responde com um código; aprove com `/forge:access <nome> pair <código>`."*
3. **Token configurado, alguém permitido, política ainda `pairing`** → *"Quer travar o acesso? Execute `/forge:access <nome> policy allowlist`."*
4. **Token configurado, política `allowlist`** → *"Pronto. Mande tarefas pelo Telegram para acionar o time Forge."*

---

## Notas de implementação

- `access.json` ausente = defaults: `{dmPolicy:"pairing", allowFrom:[], groups:{}, pending:{}}`.
- Pretty-print JSON com 2 espaços.
- O servidor relê o `.env` apenas no boot — mudanças de token requerem restart do Claude Code.
- `access.json` é relido a cada mensagem — mudanças de política via `/forge:access` têm efeito imediato.
- O `claude mcp add --scope user` grava em `~/.claude.json`.
