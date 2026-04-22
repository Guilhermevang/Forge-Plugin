# Forge

Forge é um plugin para o **Claude Code** que transforma seu Telegram em uma interface de desenvolvimento. Você manda uma tarefa pelo celular — "crie uma rota de login", "corrija esse bug", "adicione paginação na listagem" — e um time de agentes de IA (PO, Tech Lead, Developer, QA) planeja, implementa, revisa e commita no seu repositório.

Você não precisa estar na frente do computador. O Forge trabalha enquanto você está em reunião, no celular, ou fora do escritório.

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

---

## Passo 2 — Instale o Forge

Adicione o repositório do Forge como marketplace no seu `~/.claude/settings.json`:

```json
"extraKnownMarketplaces": {
  "forge": {
    "source": {
      "source": "github",
      "repo": "SEU_USUARIO/Forge"
    }
  }
},
"enabledPlugins": {
  "forge@forge": true
}
```

Substitua `SEU_USUARIO/Forge` pelo caminho do repositório no GitHub.

> **Desenvolvimento local:** se você clonou o repositório localmente, use `"source": "directory"` em vez de `"source": "github"`:
> ```json
> "forge": {
>   "source": {
>     "source": "directory",
>     "path": "/caminho/para/Forge"
>   }
> }
> ```

Reinicie o Claude Code — ele instalará o plugin automaticamente.

---

## Passo 3 — Configure o token do bot

Na pasta do projeto onde você quer que o Forge trabalhe, abra o Claude Code e execute:

```
/forge:configure 7391204856:AAHfiqksKZ8WBjkL9mXn2pQ3rVtYwUeE1Fg
```

(use o seu token, não o do exemplo)

O Forge confirma:
```
✅ Token salvo em ~/.claude/channels/forge/.env
```

---

## Passo 4 — Pareie seu Telegram

**4.1 — Mande qualquer mensagem para o seu bot no Telegram.**

O bot responde com um código de 6 caracteres:
```
Pareamento necessário — execute no Claude Code:

/forge:access pair a3f9c2
```

**4.2 — Aprove no Claude Code:**

```
/forge:access pair a3f9c2
```

O bot confirma no Telegram:
```
Pareado! Pode mandar suas tarefas.
```

**4.3 — Trave o acesso (recomendado):**

```
/forge:access policy allowlist
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

Cada projeto pode ter um bot diferente. Para isso, use variáveis de ambiente ao abrir o Claude Code:

```bash
cd ~/projetos/meu-backend
FORGE_STATE_DIR=~/.claude/channels/forge-backend \
FORGE_BOT_TOKEN=<token-do-bot-backend> \
claude
```

```bash
cd ~/projetos/meu-frontend
FORGE_STATE_DIR=~/.claude/channels/forge-frontend \
FORGE_BOT_TOKEN=<token-do-bot-frontend> \
claude
```

`FORGE_STATE_DIR` define onde o estado (token, allowlist) fica salvo. `FORGE_BOT_TOKEN` sobrescreve o token do arquivo `.env`.

Se não definir nenhuma variável, o Forge usa `~/.claude/channels/forge/` e o token configurado via `/forge:configure`.

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
/forge:access            — ver quem tem acesso
/forge:access pair <código>   — aprovar pareamento
/forge:access allow <id>      — adicionar por ID do Telegram
/forge:access remove <id>     — remover
/forge:access policy pairing  — abrir para novos pairings
/forge:access policy allowlist — travar (só allowlist)
/forge:access policy disabled  — desabilitar completamente
```

---

## Comandos do bot

| Comando | O que faz |
|---------|-----------|
| `/start` | Instruções de pareamento |
| `/help` | O que o bot faz |
| `/status` | Verificar se está pareado |

---

## Solução de problemas

**O bot não responde às minhas mensagens**

Verifique se o plugin está habilitado: `/plugins` no Claude Code. O status deve ser `Enabled`. Se não estiver, revise as entradas `extraKnownMarketplaces` e `enabledPlugins` no `~/.claude/settings.json`.

**"chat X não está na allowlist"**

A política está em `allowlist` mas o ID não foi adicionado. Execute `/forge:access policy pairing`, peça para a pessoa mandar DM ao bot, aprove com `/forge:access pair <código>`, e volte para `allowlist`.

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
├── .claude-plugin/
│   ├── marketplace.json   ← torna o repo instalável como plugin
│   └── plugin.json        ← metadados do plugin
├── .mcp.json              ← como o Claude Code inicia o servidor MCP
├── server.ts              ← MCP server: ponte Telegram ↔ Claude Code
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
