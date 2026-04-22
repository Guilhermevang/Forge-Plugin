---
name: configure
description: Configura o token do bot Telegram para o canal Forge. Use quando o usuário colar um token do BotFather, pedir para configurar o Forge, ou querer ver o status atual do canal.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(chmod *)
---

# /forge:configure — Configuração do Canal Forge

Grava o token do bot em `~/.claude/channels/forge/.env` e orienta o usuário sobre a política de acesso. O servidor lê esse arquivo no boot.

Argumentos recebidos: `$ARGUMENTS`

---

## Dispatch por argumentos

### Sem argumentos — status e orientação

Leia os dois arquivos de estado e mostre um panorama completo:

1. **Token** — verifique `~/.claude/channels/forge/.env` para `FORGE_BOT_TOKEN`.
   Mostre configurado/não-configurado; se configurado, mostre os primeiros 10 chars mascarados (`123456789:...`).

2. **Acesso** — leia `~/.claude/channels/forge/access.json` (arquivo ausente = defaults: `dmPolicy: "pairing"`, allowlist vazia). Mostre:
   - Política de DM e o que ela significa em uma linha
   - Usuários permitidos: contagem e lista de IDs
   - Pairings pendentes: contagem, com códigos e IDs se houver

3. **Próximo passo** — termine com uma ação concreta baseada no estado:
   - Sem token → *"Execute `/forge:configure <token>` com o token do BotFather."*
   - Token configurado, política é pairing, ninguém permitido → *"Mande uma DM pro seu bot no Telegram. Ele responde com um código; aprove com `/forge:access pair <código>`."*
   - Token configurado, alguém permitido → *"Pronto. Mande tarefas pelo Telegram para acionar o time Forge."*

**Empurre sempre para o lockdown.** O objetivo é `allowlist` com uma lista definida. `pairing` é temporário — só para capturar IDs. Após capturar todos os IDs, mude para `allowlist`.

Condução da conversa:
1. Leia a allowlist. Informe quem está nela.
2. Pergunte: *"É todo mundo que deve acessar o Forge por esse bot?"*
3. **Se sim e a política ainda é `pairing`** → *"Ótimo. Vamos travar:"* e ofereça executar `/forge:access policy allowlist`.
4. **Se não, faltam pessoas** → *"Peça para elas mandarem DM pro bot; você aprova cada uma com `/forge:access pair <código>`."*
5. **Se allowlist vazia e o próprio usuário ainda não pareou** → *"Mande uma DM pro seu bot primeiro para capturar seu próprio ID."*
6. **Se política já é `allowlist`** → confirme que está travado. Para adicionar alguém: *"Você pode mudar brevemente para pairing: `/forge:access policy pairing` → eles mandam DM → você aprova → volta para allowlist."*

### `<token>` — salvar token

1. Trate `$ARGUMENTS` como o token (trim whitespace). Tokens do BotFather: `123456789:AAH...`.
2. `mkdir -p ~/.claude/channels/forge`
3. Leia o `.env` existente se houver; atualize/adicione a linha `FORGE_BOT_TOKEN=`, preserve outras chaves. Escreva de volta sem aspas ao redor do valor.
4. `chmod 600 ~/.claude/channels/forge/.env` — o token é uma credencial.
5. Confirme e mostre o status (sem argumentos) para o usuário ver o estado atual.
6. Informe que o servidor lê o `.env` apenas no boot — mudanças de token precisam reiniciar a sessão com `claude --channels plugin:forge`.

### `clear` — remover token

Delete a linha `FORGE_BOT_TOKEN=` (ou o arquivo inteiro se for a única linha).

---

## Notas de implementação

- O diretório de channels pode não existir se o servidor ainda não rodou. Arquivo ausente = não configurado, não é erro.
- `access.json` é relido a cada mensagem recebida — mudanças de política via `/forge:access` têm efeito imediato, sem restart.
- Pretty-print o JSON (indent 2 espaços) para facilitar edição manual.
