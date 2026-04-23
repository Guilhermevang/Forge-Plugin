# Forge

Forge é um plugin para o **Claude Code** que transforma seu Telegram em uma interface de desenvolvimento. Você manda uma tarefa pelo celular — "crie uma rota de login", "corrija esse bug", "adicione paginação na listagem" — e um time de agentes de IA (PO, Tech Lead, Developer, QA) planeja, implementa, revisa e commita no seu repositório.

Você não precisa estar na frente do computador. O Forge trabalha enquanto você está em reunião, no celular, ou fora do escritório.

Você pode ter **um bot por projeto** — cada um com seu próprio canal, allowlist e histórico de acesso. Tudo configurado com um único comando, sem variáveis de ambiente manuais.

---

## Como funciona na prática

```
Você (Telegram) → "adiciona validação de CPF no cadastro"
  └→ Product Owner analisa e define os critérios de aceite
      └→ Tech Lead lê o projeto e monta o plano técnico
          └→ Developer implementa seguindo o plano
              └→ QA revisa o código e faz o commit
                  └→ Você recebe no Telegram: "✅ Feito — commit abc1234"
```

---

## Pré-requisitos

- **Claude Code** — o CLI da Anthropic. Instale com:

  ```bash
  npm install -g @anthropic/claude-code
  ```

- **Bun** — o runtime que o Forge usa. Instale com:

  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **Uma conta no Telegram** — qualquer conta normal serve.

---

## Passo 1 — Crie o bot no Telegram

1. Abra o Telegram e procure por **@BotFather**
2. Mande `/newbot`
3. Escolha um nome e username (deve terminar em `bot`)
4. Guarde o **token** que o BotFather enviar:
   ```
   7391204856:AAHfiqksKZ8WBjkL9mXn2pQ3rVtYwUeE1Fg
   ```

Para múltiplos projetos, repita esse processo — um bot por projeto.

---

## Passo 2 — Instale o Forge

No Claude Code, execute `/plugins` e adicione o marketplace apontando para este repositório:

```
https://github.com/Guilhermevang/Forge-Plugin.git
```

O Claude Code vai listar o plugin Forge disponível para instalar. Habilite-o.

---

## Passo 3 — Configure o canal

Execute no Claude Code, **dentro da pasta do projeto**:

```
/forge:configure backend 7391204856:AAHfiqksKZ8WBjkL9mXn2pQ3rVtYwUeE1Fg
```

O `backend` é o nome do canal — use qualquer identificador que faça sentido para o projeto (`frontend`, `mobile`, `api`, etc.).

O Forge:
- Salva o token em `~/.claude/channels/backend/.env` (global por canal)
- Pina esse canal no projeto atual gravando `.claude/forge-channel` na raiz do repo

Saia da sessão e reabra com o flag `--channels`:

```bash
claude --channels plugin:forge@forge
```

O flag é o que autoriza o Claude Code a escutar notificações do canal.

---

## Passo 4 — Pareie seu Telegram

**4.1 — Mande qualquer mensagem para o seu bot no Telegram.**

O bot responde com um código de 6 caracteres:

```
Pareamento necessário — execute no Claude Code:

/forge:access backend pair a3f9c2
```

**4.2 — Aprove no Claude Code:**

```
/forge:access backend pair a3f9c2
```

O bot confirma no Telegram:

```
Pareado! Pode mandar suas tarefas.
```

**4.3 — Trave o acesso (recomendado):**

```
/forge:access backend policy allowlist
```

---

## Passo 5 — Mande sua primeira tarefa

Com tudo configurado, mande uma mensagem de texto para o bot. Exemplos:

```
cria um arquivo utils/formatDate.ts que exporta uma função
formatDate(date: Date): string retornando no formato DD/MM/YYYY
```

```
no módulo de usuários, adiciona um campo "apelido" opcional
no schema. Não precisa de migração agora, só o tipo e a validação.
```

O bot reage com 👀 ao receber. Quando o trabalho terminar, você recebe:

```
✅ Feito!

Criei utils/formatDate.ts com a função formatDate().
Commit: feat: add formatDate utility (abc1234f)
```

---

## Múltiplos projetos

Crie um bot diferente para cada projeto e rode `/forge:configure <nome> <token>` **dentro da pasta de cada um**:

```
~/code/backend $   /forge:configure backend  7391204856:AAH...
~/code/frontend $  /forge:configure frontend 8802315967:BBH...
~/code/mobile $    /forge:configure mobile   9913426078:CCH...
```

Cada repo fica com seu próprio `.claude/forge-channel` apontando pro canal daquele projeto. Basta abrir o Claude Code no diretório do projeto com o flag:

```bash
claude --channels plugin:forge@forge
```

Para ver o estado de todos os canais:

```
/forge:configure
```

Para gerenciar o acesso do canal pinado no projeto atual (ou de outro, especificando o nome):

```
/forge:access                          — visão geral
/forge:access pair x9k2m1              — pareia no canal pinado aqui
/forge:access frontend policy allowlist
```

---

## O CLAUDE.md

O `CLAUDE.md` na raiz do seu projeto descreve a stack, convenções e arquitetura. **O Forge lê esse arquivo antes de planejar e implementar qualquer coisa.** Sem ele o Forge ainda funciona, mas pode gerar inconsistências.

```markdown
# Meu Projeto

## Stack

- Backend: NestJS + TypeScript + PostgreSQL
- ORM: TypeORM com migrations

## Convenções

- Controllers em src/modules/<nome>/<nome>.controller.ts
- Commits: Conventional Commits (feat, fix, refactor, chore)

## Não fazer

- Não usar `any` no TypeScript
```

Para criar um CLAUDE.md automaticamente: `/init`

---

## Gerenciamento de acesso

```
/forge:access                          — visão geral de todos os canais
/forge:access <canal>                  — status detalhado do canal
/forge:access <canal> pair <código>    — aprovar pareamento
/forge:access <canal> deny <código>    — rejeitar pareamento
/forge:access <canal> allow <id>       — adicionar por ID do Telegram
/forge:access <canal> remove <id>      — remover
/forge:access <canal> policy pairing   — abrir para novos pairings
/forge:access <canal> policy allowlist — travar (só allowlist)
/forge:access <canal> policy disabled  — desabilitar completamente
```

---

## Comandos do bot

| Comando   | O que faz                 |
| --------- | ------------------------- |
| `/start`  | Instruções de pareamento  |
| `/help`   | O que o bot faz           |
| `/status` | Verificar se está pareado |

---

## Solução de problemas

**O bot não responde às minhas mensagens**

Verifique se o plugin está habilitado: `/plugins` no Claude Code. O status deve ser `Enabled`. Verifique também se o canal está registrado: `/forge:configure`.

**"chat X não está na allowlist"**

A política está em `allowlist` mas o ID não foi adicionado. Execute `/forge:access <canal> policy pairing`, peça para a pessoa mandar DM ao bot, aprove com `/forge:access <canal> pair <código>`, e volte para `allowlist`.

**409 Conflict no log**

Uma sessão anterior não encerrou. O Forge resolve automaticamente na maioria dos casos. Se persistir:

```bash
pkill -f "bun server.ts"
```

**Quero desfazer o que o Forge fez**

```bash
git revert HEAD
```

---

## Estrutura do plugin

```
forge/
├── server.ts              ← MCP server: ponte Telegram ↔ Claude Code
├── package.json
├── agents/
│   ├── po.md              ← instruções do Product Owner
│   ├── tech-lead.md       ← instruções do Tech Lead
│   ├── developer.md       ← instruções do Developer
│   └── qa.md              ← instruções do QA Engineer
└── skills/
    ├── configure/          ← /forge:configure
    └── access/             ← /forge:access
```

Os arquivos em `agents/` definem o comportamento de cada papel. Edite-os para ajustar ao contexto do seu projeto.

---

## Estado em disco

Global (por canal):

```
~/.claude/channels/
  <nome>/
    .env          ← FORGE_BOT_TOKEN (chmod 600)
    access.json   ← allowlist, política, pendentes
    approved/     ← notificações de aprovação (efêmero)
    inbox/        ← fotos e documentos recebidos (efêmero)
    bot.pid       ← PID do poller atual
```

Por projeto:

```
<repo>/.claude/forge-channel    ← nome do canal pinado neste projeto
```

O servidor MCP é declarado pelo próprio plugin em `.mcp.json` — nada é registrado manualmente via `claude mcp add`. Ao iniciar, o servidor lê `.claude/forge-channel` no cwd, resolve o `~/.claude/channels/<nome>/` correspondente e sobe o bot.
