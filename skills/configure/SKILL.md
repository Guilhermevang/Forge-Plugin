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
   > *"Nenhum canal configurado. Execute `/forge:configure <nome> <token>` para criar o primeiro."*
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
6. **Instale a função `forge` no shell do usuário** (idempotente — não duplique se já existir). Detecte o SO e trate conforme:

   **Linux / macOS (bash, zsh):**
   - Detecte os rc files presentes: `~/.bashrc`, `~/.bash_profile`, `~/.zshrc`. No macOS o shell default é zsh desde Catalina, mas mantenha ambos se existirem. Se nenhum existir, crie `~/.bashrc` no Linux e `~/.zshrc` no macOS.
   - Para cada rc file alvo:
     - Leia o arquivo. Se já contiver a linha marcadora `# >>> forge launcher >>>`, pule (já instalado).
     - Caso contrário, **append** o bloco:
       ```bash
       # >>> forge launcher >>>
       # Lança o Claude Code com o plugin Forge habilitado no canal informado.
       # Uso: forge <canal> [args extras para claude]
       forge() {
         if [ -z "$1" ] || [ "${1#-}" != "$1" ]; then
           echo "uso: forge <canal> [args extras]" >&2
           return 1
         fi
         local _forge_ch="$1"; shift
         FORGE_CHANNEL="$_forge_ch" command claude --dangerously-load-development-channels forge@forge "$@"
       }
       # <<< forge launcher <<<
       ```
   - Mensagem ao usuário: *"Rode `source ~/.bashrc` (ou `~/.zshrc`) ou reabra o terminal."*

   **Windows (PowerShell):**
   - Resolva o caminho do profile executando `pwsh -NoProfile -Command '$PROFILE.CurrentUserAllHosts'` (ou `powershell` no Windows PowerShell 5.1). Se o diretório não existir, crie-o.
   - Se o profile já contiver `# >>> forge launcher >>>`, pule.
   - Caso contrário, append:
     ```powershell
     # >>> forge launcher >>>
     # Lanca o Claude Code com o plugin Forge habilitado no canal informado.
     # Uso: forge <canal> [args extras para claude]
     function forge {
       if ($args.Count -lt 1 -or $args[0].ToString().StartsWith('-')) {
         Write-Error "uso: forge <canal> [args extras]"
         return
       }
       $env:FORGE_CHANNEL = $args[0]
       if ($args.Count -gt 1) {
         claude --dangerously-load-development-channels forge@forge @($args[1..($args.Count-1)])
       } else {
         claude --dangerously-load-development-channels forge@forge
       }
     }
     # <<< forge launcher <<<
     ```
   - Mensagem ao usuário: *"Reabra o PowerShell ou rode `. $PROFILE` para carregar o comando."*
   - Se o usuário tiver Git Bash / WSL, trate-o como Linux (use o `.bashrc` correspondente).

7. Confirme: *"Canal `<nome>` configurado. Use `forge <nome>` de qualquer diretório para abrir o Claude com o Forge. Reabra o terminal ou recarregue o profile para o comando ficar disponível."*
8. Mostre o status do canal (token mascarado, política, permitidos).
9. Conduza a conversa (seção abaixo).

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

1. **Nenhum canal** → *"Execute `/forge:configure <nome> <token>` com o token do BotFather."*
2. **Canal criado, política `pairing`, ninguém permitido** → *"Rode `forge <nome>` em outro terminal; mande DM pro bot no Telegram; ele responde com código. Aprove com `/forge:access pair <código>`."*
3. **Canal criado, alguém permitido, política ainda `pairing`** → *"Travar acesso? `/forge:access policy allowlist`."*
4. **Canal criado, política `allowlist`** → *"Pronto. Rode `forge <nome>` e mande tarefas pelo Telegram."*

---

## Notas de implementação

- O servidor resolve o canal na ordem: `FORGE_STATE_DIR` env (override completo) → `FORGE_CHANNEL` env → erro. O launcher `forge` sempre seta `FORGE_CHANNEL`, então em uso normal sempre cai nesse caminho.
- `access.json` ausente implica defaults — não é erro. Pretty-print JSON com 2 espaços.
- O `.env` é lido só no boot. Trocar token requer reiniciar o Claude Code.
- `access.json` é relido a cada mensagem — mudanças via `/forge:access` têm efeito imediato.
- **Nunca** rode `claude mcp add` / `claude mcp remove` — o plugin declara seu próprio server em `.mcp.json`. Instalações antigas podem ter entries órfãos `forge-*` em `~/.claude.json`; oriente o usuário a remover com `claude mcp remove forge-<nome> --scope user` se notar.
- **Nada fica dentro dos projetos.** Toda a seleção de canal é feita via `FORGE_CHANNEL` (setado pelo launcher `forge`). Sem marker files, sem `.claude/forge-channel`.
