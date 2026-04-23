---
name: configure
description: Configura canais Forge — cria canais com token do BotFather, pina o canal no projeto atual e mostra status. Use quando o usuário colar um token, pedir para configurar o Forge, listar canais existentes, ou verificar o status de um canal.
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
---

# /forge:configure — Configuração de Canais Forge

Cada canal Forge é um bot Telegram independente com seu próprio token. Tokens e estado ficam em `~/.claude/channels/<nome>/`. Cada projeto pina **um canal** gravando seu nome em `.claude/forge-channel` na raiz do projeto — essa é a única coisa que decide qual bot a sessão atual do Claude Code atende.

O servidor MCP é declarado pelo próprio plugin (em `.mcp.json`), portanto esta skill **não** usa `claude mcp add`.

Argumentos recebidos: `$ARGUMENTS`

---

## Dispatch por argumentos

Parse `$ARGUMENTS` (trim whitespace).

### Sem argumentos — status geral

1. Liste `~/.claude/channels/` (crie se não existir). Cada subdiretório é um canal.
2. Para cada canal, leia seu `.env` (token, mascarado nos primeiros 10 chars) e `access.json` (política + contagem de permitidos).
3. Leia `./.claude/forge-channel` (se existir) para mostrar qual canal está pinado no projeto atual.
4. Exiba tabela: **Canal**, **Token**, **Política**, **Permitidos**, **Pinado aqui?**.
5. Se nenhum canal existir:
   > *"Nenhum canal configurado. Execute `/forge:configure <nome> <token>` para criar o primeiro."*
6. Conduza a conversa (seção abaixo).

---

### `<nome> <token>` — criar/atualizar canal e pinar no projeto

`<nome>` é o identificador do canal (ex: `backend`, `dropflux-frontend`, `mobile`). Valide: só `[a-zA-Z0-9_-]`, rejeite se tiver `/`, `..`, espaço.

`<token>` é o token do BotFather (formato `123456789:AAH...`).

1. Valide `<nome>` (regex `^[a-zA-Z0-9_-]+$`). Se inválido, explique e pare.
2. Valide que `<token>` contém `:`. Se não, avise e pare.
3. `mkdir -p ~/.claude/channels/<nome>`
4. Leia `~/.claude/channels/<nome>/.env` se houver; atualize/adicione a linha `FORGE_BOT_TOKEN=<token>`, preservando outras chaves. Escreva sem aspas.
5. `chmod 600 ~/.claude/channels/<nome>/.env`
6. `mkdir -p ./.claude`
7. Escreva `./.claude/forge-channel` com o conteúdo `<nome>` (sem newline final é ok — o servidor faz `.trim()`).
8. **Instale a função `forge` no shell do usuário** (idempotente — não duplique se já existir):
   - Detecte os rc files presentes: `~/.bashrc` e `~/.zshrc`. Se nenhum existir, use `~/.bashrc` como default.
   - Para cada rc file existente (ou o default):
     - Leia o arquivo. Se já contiver a linha marcadora `# >>> forge launcher >>>`, pule (já instalado).
     - Caso contrário, **append** o seguinte bloco ao final (use `Write` em append-mode via leitura + concat, ou `Edit` adicionando após a última linha):
       ```bash
       # >>> forge launcher >>>
       # Lança o Claude Code com a flag necessária para plugins com claude/channel.
       # Uso: forge <canal> [args extras para claude]
       #      forge                      # usa o canal pinado no projeto atual
       forge() {
         if [ -n "$1" ] && [ "${1#-}" = "$1" ]; then
           local _forge_ch="$1"; shift
           FORGE_CHANNEL="$_forge_ch" command claude --dangerously-load-development-channels "$@"
         else
           command claude --dangerously-load-development-channels "$@"
         fi
       }
       # <<< forge launcher <<<
       ```
   - Informe ao usuário quais arquivos foram atualizados e que ele precisa rodar `source ~/.bashrc` (ou reabrir o terminal) para o comando ficar disponível.
9. Confirme: *"Canal `<nome>` configurado e pinado neste projeto. Use `forge <nome>` (ou só `forge` dentro do projeto) para iniciar o Claude Code com o Forge ativado. Reabra o terminal ou rode `source ~/.bashrc` (ou `~/.zshrc`) para o comando ficar disponível."*
10. Mostre o status do canal (token mascarado, política, permitidos).
11. Conduza a conversa (seção abaixo).

---

### `<nome>` — status de um canal específico (sem pinar)

1. Verifique se `~/.claude/channels/<nome>/` existe. Se não, avise.
2. Leia `.env` e `access.json`.
3. Mostre: token (mascarado), política, permitidos, pendentes.
4. Se o canal **não** for o pinado no projeto atual, ofereça:
   > *"Pinar `<nome>` neste projeto? Rode `/forge:configure <nome> <token>` (com o mesmo token) ou digo pra pinar direto."*
   (Se o usuário confirmar pinar sem dar token, apenas escreva `./.claude/forge-channel` com `<nome>`.)

---

### `<nome> pin` — pinar um canal já existente no projeto atual

1. Verifique `~/.claude/channels/<nome>/` existe.
2. `mkdir -p ./.claude` e escreva `./.claude/forge-channel` com `<nome>`.
3. Confirme e lembre de reiniciar o Claude Code.

---

### `<nome> clear` — remover canal

1. Confirme com o usuário (remove token e estado do canal inteiro).
2. `rm -rf ~/.claude/channels/<nome>` (só após confirmação explícita).
3. Se `./.claude/forge-channel` apontar para esse canal, remova o arquivo também.
4. Confirme.

---

### `unpin` — remover o pin do projeto atual (sem apagar o canal)

1. Remova `./.claude/forge-channel` se existir.
2. Confirme.

---

## Condução da conversa

Após mostrar status:

1. **Nenhum canal** → *"Execute `/forge:configure <nome> <token>` com o token do BotFather."*
2. **Canal criado mas não pinado no projeto** → *"Pine com `/forge:configure <nome> pin` dentro do projeto."*
3. **Canal pinado, política `pairing`, ninguém permitido** → *"Mande DM pro bot no Telegram; ele responde com código. Aprove com `/forge:access pair <código>`."*
4. **Canal pinado, alguém permitido, política ainda `pairing`** → *"Travar acesso? `/forge:access policy allowlist`."*
5. **Canal pinado, política `allowlist`** → *"Pronto. Rode `claude --channels plugin:forge@forge` e mande tarefas pelo Telegram."*

---

## Notas de implementação

- O servidor resolve o canal na ordem: `FORGE_STATE_DIR` env (override completo) → `FORGE_CHANNEL` env → `./.claude/forge-channel` → erro. Em uso normal via plugin, sempre cai no marker do projeto.
- `access.json` ausente implica defaults — não é erro. Pretty-print JSON com 2 espaços.
- O `.env` é lido só no boot. Trocar token requer reiniciar o Claude Code.
- `access.json` é relido a cada mensagem — mudanças via `/forge:access` têm efeito imediato.
- **Nunca** rode `claude mcp add` / `claude mcp remove` — o plugin declara seu próprio server em `.mcp.json`. Instalações antigas podem ter entries órfãos `forge-*` em `~/.claude.json`; oriente o usuário a remover com `claude mcp remove forge-<nome> --scope user` se notar.
- O arquivo `./.claude/forge-channel` é por-projeto. Normalmente entra no `.gitignore` (seleção local de qual bot atende aquele repo para aquele desenvolvedor), mas o usuário pode commitar se o time todo usar o mesmo canal.
