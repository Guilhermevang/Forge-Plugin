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

Antes de começar, você precisa ter instalado:

- **Claude Code** — o CLI da Anthropic. Instale com:
  ```bash
  npm install -g @anthropic/claude-code
  ```

- **Bun** — o runtime JavaScript que o Forge usa. Instale com:
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **Uma conta no Telegram** — qualquer conta normal serve.

---

## Passo 1 — Crie o bot no Telegram

O Forge precisa de um bot do Telegram para receber suas mensagens. Criar um bot é grátis e leva 2 minutos.

1. Abra o Telegram e procure por **@BotFather**
2. Mande `/newbot`
3. Escolha um nome para o bot (exemplo: `Forge Dev`)
4. Escolha um username — precisa terminar em `bot` (exemplo: `forge_meu_projeto_bot`)
5. O BotFather vai te mandar um **token** parecido com isso:
   ```
   7391204856:AAHfiqksKZ8WBjkL9mXn2pQ3rVtYwUeE1Fg
   ```
   Guarde esse token — você vai precisar no próximo passo.

---

## Passo 2 — Configure o Forge no seu projeto

Abra um terminal **na pasta do seu projeto** (aquele que tem o `CLAUDE.md`, ou onde você quer que o Forge trabalhe).

**2.1 — Registre o plugin:**
```bash
claude --plugin-dir /caminho/para/forge
```
Substitua `/caminho/para/forge` pelo caminho onde você salvou o plugin.

> Se você clonou o Forge em `~/plugins/forge`, use `--plugin-dir ~/plugins/forge`.

**2.2 — Salve o token do bot:**

Dentro da sessão do Claude Code que abriu, execute:
```
/forge:configure 7391204856:AAHfiqksKZ8WBjkL9mXn2pQ3rVtYwUeE1Fg
```
(use o seu token, não esse do exemplo)

O Forge vai confirmar que o token foi salvo. Você vai ver algo como:
```
✅ Token salvo em ~/.claude/channels/forge/.env
```

---

## Passo 3 — Pareie seu Telegram com o Forge

"Parear" é o processo de autorizar o seu Telegram a mandar comandos para o Forge. Isso garante que só você (ou quem você autorizar) pode enviar tarefas.

**3.1 — Inicie o Forge com o canal ativo:**
```bash
claude --channels plugin:forge --plugin-dir /caminho/para/forge
```

**3.2 — Mande qualquer mensagem para o seu bot no Telegram:**

Abra o Telegram, procure o bot que você criou pelo username (exemplo: `@forge_meu_projeto_bot`) e mande qualquer coisa — pode ser um "oi".

O bot vai responder com um código de 6 caracteres:
```
Pareamento necessário — execute no Claude Code:

/forge:access pair a3f9c2
```

**3.3 — Aprove o pareamento no Claude Code:**

De volta no terminal do Claude Code, execute o comando que o bot te mandou:
```
/forge:access pair a3f9c2
```

O Forge vai confirmar:
```
✅ Aprovado: sender 412587349
```

E o bot no Telegram vai te mandar:
```
Pareado! Pode mandar suas tarefas.
```

**3.4 — Trave o acesso (recomendado):**

Por padrão, qualquer pessoa que souber o username do seu bot pode tentar parear. Depois de parear seu próprio Telegram, trave o acesso para que ninguém mais consiga:
```
/forge:access policy allowlist
```

A partir de agora, só quem já está na lista pode mandar tarefas. Para adicionar outra pessoa no futuro, você usa `/forge:access policy pairing` temporariamente, ela pareia, e você volta para `allowlist`.

---

## Passo 4 — Mande sua primeira tarefa

Com tudo configurado, mande uma mensagem de texto para o seu bot no Telegram.

### Exemplos de tarefas

**Tarefa simples:**
```
cria um arquivo utils/formatDate.ts que exporta uma função 
formatDate(date: Date): string retornando no formato DD/MM/YYYY
```

**Tarefa com contexto:**
```
no módulo de usuários, adiciona um campo "apelido" opcional 
no schema. Não precisa de migração agora, só o tipo e a validação.
```

**Correção de bug:**
```
a listagem de produtos está quebrando quando o preço é zero.
o erro tá no componente ProductCard.tsx
```

**Tarefa de refatoração:**
```
extrai a lógica de paginação do componente UserList para um 
hook usePagination reutilizável
```

O bot vai reagir com 👀 confirmando que recebeu. Quando o trabalho terminar, você recebe um resumo:
```
✅ Feito!

Criei utils/formatDate.ts com a função formatDate(). 
Aceita Date e retorna string no formato DD/MM/YYYY usando 
Intl.DateTimeFormat para compatibilidade com locales.

Commit: feat: add formatDate utility (abc1234f)
```

---

## Dicas para boas tarefas

**Seja específico sobre o comportamento esperado**, não sobre como implementar:
- ✅ "a função deve retornar null se o array estiver vazio"
- ❌ "usa um ternário pra verificar se o array tem elementos"

**Mencione arquivos relevantes** quando souber:
- ✅ "no UserService.ts, o método findById está retornando undefined em vez de lançar NotFoundException"
- ❌ "o serviço de usuário tá com bug"

**Uma tarefa por mensagem.** O Forge trata cada mensagem como uma tarefa independente. Se você tem duas coisas para fazer, mande duas mensagens separadas.

**Se o PO perguntar algo**, responda diretamente no Telegram. O Forge aguarda sua resposta antes de continuar. Isso acontece quando a tarefa tem uma ambiguidade crítica — por exemplo, se você pediu "adiciona autenticação" sem especificar qual método (JWT, session, OAuth).

---

## Rodando múltiplos projetos ao mesmo tempo

Você pode ter um bot diferente para cada projeto. Cada projeto roda em um terminal separado com seu próprio estado.

**Terminal 1 — projeto backend:**
```bash
cd ~/projetos/meu-backend
FORGE_STATE_DIR=~/.claude/channels/forge-backend \
FORGE_BOT_TOKEN=<token-do-bot-backend> \
claude --channels plugin:forge --plugin-dir ~/plugins/forge
```

**Terminal 2 — projeto frontend:**
```bash
cd ~/projetos/meu-frontend
FORGE_STATE_DIR=~/.claude/channels/forge-frontend \
FORGE_BOT_TOKEN=<token-do-bot-frontend> \
claude --channels plugin:forge --plugin-dir ~/plugins/forge
```

Cada projeto tem seu próprio bot, seu próprio estado de acesso, e trabalha de forma completamente independente.

---

## O CLAUDE.md — como o Forge conhece seu projeto

O `CLAUDE.md` é um arquivo na raiz do seu projeto que descreve a stack, as convenções e a arquitetura. **O Forge lê esse arquivo antes de planejar e implementar qualquer coisa.**

Sem um `CLAUDE.md`, o Forge ainda funciona, mas vai ter que inferir as convenções pelo código existente, o que pode gerar inconsistências.

**Exemplo de CLAUDE.md:**
```markdown
# Meu Projeto

## Stack
- Backend: NestJS + TypeScript + PostgreSQL
- ORM: TypeORM com migrations
- Autenticação: JWT com refresh token

## Convenções
- Controllers em `src/modules/<nome>/<nome>.controller.ts`
- Services em `src/modules/<nome>/<nome>.service.ts`
- DTOs em `src/modules/<nome>/dto/`
- Sempre usar `class-validator` para validação de DTOs
- Commits: Conventional Commits (feat, fix, refactor, chore)

## Não fazer
- Não usar `any` no TypeScript
- Não commitar sem testes para lógica de negócio nova
```

Se você ainda não tem um `CLAUDE.md`, pode pedír ao Claude Code para criar um:
```
/init
```

---

## Gerenciamento de acesso

### Verificar quem tem acesso
```
/forge:access
```

### Adicionar alguém manualmente (se você souber o ID numérico do Telegram)
```
/forge:access allow 412587349
```

### Remover alguém
```
/forge:access remove 412587349
```

### Abrir temporariamente para novos pairings
```
/forge:access policy pairing
```

### Travar (só allowlist pode mandar tarefas)
```
/forge:access policy allowlist
```

### Desabilitar completamente
```
/forge:access policy disabled
```

---

## Comandos do bot no Telegram

Você também pode usar comandos diretamente no chat com o bot:

| Comando | O que faz |
|---------|-----------|
| `/start` | Mostra as instruções de pareamento |
| `/help` | Explica o que o bot faz |
| `/status` | Mostra se você está pareado |

---

## Solução de problemas

**O bot não responde às minhas mensagens**

Verifique se o Claude Code está rodando com `--channels plugin:forge`. O bot só processa mensagens quando há uma sessão ativa.

**"chat X não está na allowlist"**

Você provavelmente definiu `policy allowlist` antes de concluir o pareamento. Execute `/forge:access` para ver o estado atual e, se necessário, mude para `policy pairing`, repare, e volte para `allowlist`.

**409 Conflict no log do servidor**

Acontece quando uma sessão anterior não encerrou corretamente e ainda está fazendo polling. O Forge tenta resolver automaticamente ao iniciar. Se persistir, aguarde ~30 segundos ou encerre processos `bun` residuais:
```bash
pkill -f "bun server.ts"
```

**O Forge fez algo errado / além do pedido**

Você pode desfazer o commit antes de continuar:
```bash
git revert HEAD
```
Depois refine a tarefa e reenvie com mais detalhes sobre o que não estava correto.

**Quero ver o que está acontecendo durante a execução**

O Forge edita a própria mensagem durante o processamento para mostrar o progresso. Quando a tarefa termina, uma nova mensagem é enviada (isso gera push notification no seu celular).

---

## Estrutura do plugin

```
forge/
├── server.ts          ← MCP server: ponte Telegram ↔ Claude Code
├── agents/
│   ├── po.md          ← instruções do Product Owner
│   ├── tech-lead.md   ← instruções do Tech Lead
│   ├── developer.md   ← instruções do Developer
│   └── qa.md          ← instruções do QA
└── skills/
    ├── configure/     ← /forge:configure
    └── access/        ← /forge:access
```

Os arquivos em `agents/` definem o comportamento de cada papel. Você pode editá-los para ajustar como cada agente se comporta no seu contexto específico.
