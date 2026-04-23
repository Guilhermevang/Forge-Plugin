---
name: configure
description: Configura canais Forge — cria canais com token do BotFather e instala o launcher `forge` no shell. Use quando o usuário colar um token, pedir para configurar o Forge, listar canais existentes, ou verificar o status de um canal.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(chmod *)
  - Bash(rm *)
  - Bash(grep *)
  - Bash(test *)
  - Bash(uname *)
  - Bash(pwsh *)
  - Bash(powershell *)
  - Bash(cat *)
---

# /forge:configure — Configuração de Canais Forge

Cada canal Forge é um bot Telegram independente com seu próprio token. Tokens e estado ficam em `~/.claude/channels/<nome>/`. O canal ativo em uma sessão é sempre informado explicitamente via `forge <nome>` (que seta `FORGE_CHANNEL=<nome>`). **Nada é gravado dentro de projetos** — nenhum marcador, nenhum arquivo em `./.claude/`.

O servidor MCP é declarado pelo próprio plugin (em `.mcp.json`), portanto esta skill **não** usa `claude mcp add`.

Argumentos recebidos: `$ARGUMENTS`

---

## Dispatch por argumentos

Parse `$ARGUMENTS` (trim whitespace).

### Sem argumentos — status geral

1. Liste `~/.claude/channels/` (crie se não existir). Cada subdiretório é um canal.
2. Para cada canal, leia seu `.env` (token, mascarado nos primeiros 10 chars) e `access.json` (política + contagem de permitidos).
3. Exiba tabela: **Canal**, **Token**, **Política**, **Permitidos**.
4. Se nenhum canal existir:
   > _"Nenhum canal configurado. Execute `/forge:configure <nome> <token>` para criar o primeiro."_
5. Conduza a conversa (seção abaixo).

---

### `<nome> <token>` — criar/atualizar canal e instalar launcher

`<nome>` é o identificador do canal (ex: `backend`, `dropflux-frontend`, `mobile`). Valide: só `[a-zA-Z0-9_-]`, rejeite se tiver `/`, `..`, espaço.

`<token>` é o token do BotFather (formato `123456789:AAH...`).

1. Valide `<nome>` (regex `^[a-zA-Z0-9_-]+$`). Se inválido, explique e pare.
2. Valide que `<token>` contém `:`. Se não, avise e pare.
3. `mkdir -p ~/.claude/channels/<nome>`
4. Leia `~/.claude/channels/<nome>/.env` se houver; atualize/adicione a linha `FORGE_BOT_TOKEN=<token>`, preservando outras chaves. Escreva sem aspas.
5. `chmod 600 ~/.claude/channels/<nome>/.env`
6. **Registre as ferramentas do Forge no allowlist do Claude Code** (`~/.claude/settings.json`). Sem isso, cada chamada a `forge_reply`, `forge_react`, etc. abre um prompt de permissão que trava a entrega ao Telegram.
   - Crie `~/.claude/settings.json` se não existir (conteúdo inicial: `{}`).
   - Leia o arquivo como JSON. Se falhar no parse, **pare** e peça ao usuário para consertar manualmente (não sobrescreva).
   - Garanta que `permissions.allow` seja um array. Adicione ao array (se ainda não presentes — idempotente) as 4 entradas:
     - `mcp__forge__forge_reply`
     - `mcp__forge__forge_react`
     - `mcp__forge__forge_edit_message`
     - `mcp__forge__forge_download_attachment`
   - Preserve todas as outras chaves do settings.json intactas. Escreva com `JSON.stringify(obj, null, 2)`.
7. **Instale a função `forge` no shell do usuário** (idempotente — atualiza se marcador antigo existir). Detecte o SO e trate conforme:

   **Linux / macOS (bash, zsh):**
   - Detecte os rc files presentes: `~/.bashrc`, `~/.bash_profile`, `~/.zshrc`. No macOS o shell default é zsh desde Catalina, mas mantenha ambos se existirem. Se nenhum existir, crie `~/.bashrc` no Linux e `~/.zshrc` no macOS.
   - Para cada rc file alvo:
     - Leia o arquivo. Se contiver o marcador atual `# >>> forge launcher v2 >>>`, pule (já atualizado).
     - Se contiver apenas o marcador antigo `# >>> forge launcher >>>` (sem `v2`), **remova o bloco inteiro entre `# >>> forge launcher >>>` e `# <<< forge launcher <<<`** e siga para o append abaixo.
     - Append o bloco v2:
       ```bash
       # >>> forge launcher v2 >>>
       # Lança o Claude Code com o plugin Forge habilitado no canal informado.
       # Lê ~/.claude/channels/<canal>/mode ("edit" => bypassPermissions).
       # Uso: forge <canal> [args extras para claude]
       forge() {
         if [ -z "$1" ] || [ "${1#-}" != "$1" ]; then
           echo "uso: forge <canal> [args extras]" >&2
           return 1
         fi
         local _forge_ch="$1"; shift
         local _forge_mode_file="$HOME/.claude/channels/$_forge_ch/mode"
         local _forge_mode=""
         if [ -r "$_forge_mode_file" ]; then
           _forge_mode=$(tr -d '[:space:]' < "$_forge_mode_file")
         fi
         if [ "$_forge_mode" = "edit" ]; then
           FORGE_CHANNEL="$_forge_ch" command claude --dangerously-load-development-channels plugin:forge@forge --permission-mode bypassPermissions "$@"
         else
           FORGE_CHANNEL="$_forge_ch" command claude --dangerously-load-development-channels plugin:forge@forge "$@"
         fi
       }
       # <<< forge launcher <<<
       ```
   - Mensagem ao usuário: _"Rode `source ~/.bashrc` (ou `~/.zshrc`) ou reabra o terminal."_

   **Windows (PowerShell):**
   - Resolva o caminho do profile executando `pwsh -NoProfile -Command '$PROFILE.CurrentUserAllHosts'` (ou `powershell` no Windows PowerShell 5.1). Se o diretório não existir, crie-o.
   - Se o profile contiver `# >>> forge launcher v2 >>>`, pule.
   - Se contiver apenas `# >>> forge launcher >>>` (sem v2), remova o bloco entre `# >>> forge launcher >>>` e `# <<< forge launcher <<<` e siga para o append.
   - Append o bloco v2:
     ```powershell
     # >>> forge launcher v2 >>>
     # Lanca o Claude Code com o plugin Forge habilitado no canal informado.
     # Le ~/.claude/channels/<canal>/mode ("edit" => bypassPermissions).
     # Uso: forge <canal> [args extras para claude]
     function forge {
       if ($args.Count -lt 1 -or $args[0].ToString().StartsWith('-')) {
         Write-Error "uso: forge <canal> [args extras]"
         return
       }
       $channel = $args[0]
       $env:FORGE_CHANNEL = $channel
       $modeFile = Join-Path $HOME ".claude/channels/$channel/mode"
       $extra = if ($args.Count -gt 1) { $args[1..($args.Count-1)] } else { @() }
       $mode = ''
       if (Test-Path $modeFile) { $mode = (Get-Content $modeFile -Raw).Trim() }
       if ($mode -eq 'edit') {
         claude --dangerously-load-development-channels plugin:forge@forge --permission-mode bypassPermissions @extra
       } else {
         claude --dangerously-load-development-channels plugin:forge@forge @extra
       }
     }
     # <<< forge launcher <<<
     ```
   - Mensagem ao usuário: _"Reabra o PowerShell ou rode `. $PROFILE` para carregar o comando."_
   - Se o usuário tiver Git Bash / WSL, trate-o como Linux (use o `.bashrc` correspondente).

8. Confirme: _"Canal `<nome>` configurado. Use `forge <nome>` de qualquer diretório para abrir o Claude com o Forge. Reabra o terminal ou recarregue o profile para o comando ficar disponível."_
9. Mostre o status do canal (token mascarado, política, permitidos).
10. Conduza a conversa (seção abaixo).

---

### `<nome>` — status de um canal específico

1. Verifique se `~/.claude/channels/<nome>/` existe. Se não, avise.
2. Leia `.env` e `access.json`.
3. Mostre: token (mascarado), política, permitidos, pendentes.

---

### `<nome> clear` — remover canal

1. Confirme com o usuário (remove token e estado do canal inteiro).
2. `rm -rf ~/.claude/channels/<nome>` (só após confirmação explícita).
3. Confirme.

---

## Condução da conversa

Após mostrar status:

1. **Nenhum canal** → _"Execute `/forge:configure <nome> <token>` com o token do BotFather."_
2. **Canal criado, política `pairing`, ninguém permitido** → _"Rode `forge <nome>` em outro terminal; mande DM pro bot no Telegram; ele responde com código. Aprove com `/forge:access pair <código>`."_
3. **Canal criado, alguém permitido, política ainda `pairing`** → _"Travar acesso? `/forge:access policy allowlist`."_
4. **Canal criado, política `allowlist`** → _"Pronto. Rode `forge <nome>` e mande tarefas pelo Telegram."_

---

## Notas de implementação

- O servidor resolve o canal na ordem: `FORGE_STATE_DIR` env (override completo) → `FORGE_CHANNEL` env → erro. O launcher `forge` sempre seta `FORGE_CHANNEL`, então em uso normal sempre cai nesse caminho.
- `access.json` ausente implica defaults — não é erro. Pretty-print JSON com 2 espaços.
- O `.env` é lido só no boot. Trocar token requer reiniciar o Claude Code.
- `access.json` é relido a cada mensagem — mudanças via `/forge:access` têm efeito imediato.
- **Nunca** rode `claude mcp add` / `claude mcp remove` — o plugin declara seu próprio server em `.mcp.json`. Instalações antigas podem ter entries órfãos `forge-*` em `~/.claude.json`; oriente o usuário a remover com `claude mcp remove forge-<nome> --scope user` se notar.
- **Nada fica dentro dos projetos.** Toda a seleção de canal é feita via `FORGE_CHANNEL` (setado pelo launcher `forge`). Sem marker files, sem `.claude/forge-channel`.
- **Modo do canal** (`~/.claude/channels/<canal>/mode`): contém `edit` ou `ask`. O launcher lê no boot — `edit` passa `--permission-mode bypassPermissions` ao `claude`. Troca via Telegram: `/mode edit` ou `/mode ask` (handlers do bot gravam o arquivo). Vale a partir da próxima sessão `forge <canal>`.
