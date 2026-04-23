# Forge

> **Mande tarefas de programação pelo Telegram. Um time de IA faz o trabalho.**

Forge é um plugin para o **Claude Code** que transforma seu Telegram em um canal direto com um time de agentes de IA. Você manda uma mensagem — _"cria um endpoint de login"_, _"corrige aquele bug da paginação"_, _"adiciona validação de CPF"_ — e quatro agentes especializados (Product Owner, Tech Lead, Developer, QA) planejam, implementam, revisam e commitam no seu repositório.

Você não precisa estar na frente do computador. O Forge trabalha enquanto você está em reunião, no ônibus, ou tomando um café.

---

## 📖 Sumário

1. [Quem é esse tal de Claude Code?](#-quem-é-esse-tal-de-claude-code)
2. [Como funciona o Forge na prática](#-como-funciona-o-forge-na-prática)
3. [Antes de começar](#-antes-de-começar-o-que-você-precisa-ter)
4. [Instalação passo a passo](#-instalação-passo-a-passo)
   - [Passo 1 — Criar um bot no Telegram](#passo-1--criar-um-bot-no-telegram)
   - [Passo 2 — Instalar o Forge no Claude Code](#passo-2--instalar-o-forge-no-claude-code)
   - [Passo 3 — Configurar um canal para seu projeto](#passo-3--configurar-um-canal-para-seu-projeto)
   - [Passo 4 — Parear seu Telegram](#passo-4--parear-seu-telegram-autorizar-seu-número)
   - [Passo 5 — Mandar sua primeira tarefa](#passo-5--mandar-sua-primeira-tarefa)
5. [Trabalhando com vários projetos](#-trabalhando-com-vários-projetos)
6. [O arquivo CLAUDE.md](#-o-arquivo-claudemd-o-mapa-do-seu-projeto)
7. [Modo edit vs ask](#-modo-edit-vs-ask-controle-de-autonomia)
8. [Gerenciando o acesso](#-gerenciando-o-acesso)
9. [Voz do Reporter (TTS)](#-voz-do-reporter-tts)
10. [Comandos do bot](#-comandos-do-bot-dentro-do-telegram)
11. [Perguntas frequentes (FAQ)](#-perguntas-frequentes)
12. [Quando algo dá errado](#-quando-algo-dá-errado)
13. [Entendendo a arquitetura](#-entendendo-a-arquitetura-para-curiosos-e-devs)

---

## 🤖 Quem é esse tal de Claude Code?

**Claude Code** é uma ferramenta de linha de comando (o famoso "terminal") da Anthropic que coloca o modelo de IA Claude dentro do seu ambiente de desenvolvimento. Diferente do Claude no navegador, o Claude Code **executa ações de verdade** no seu computador: lê arquivos, edita código, roda testes, faz commits no git.

Não entendeu nada? Tranquilo. Em uma analogia: é como ter um estagiário técnico muito rápido que entra no seu projeto e faz o que você pedir — mas em vez de falar pessoalmente, você conversa via texto.

O **Forge** é um "plugin" (extensão) para o Claude Code que move essa conversa do terminal para o Telegram. Resultado: você pode pedir código de qualquer lugar, usando o celular, e o código aparece no repo do projeto.

---

## ⚙️ Como funciona o Forge na prática

```
                     📱 Você (Telegram)
                          │
                          │ "adiciona validação de CPF
                          │  no formulário de cadastro"
                          ▼
              ┌───────────────────────┐
              │  🗂  Product Owner    │   traduz o pedido em
              │                       │   requisitos objetivos
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │  🏗  Tech Lead         │   lê o projeto e
              │                       │   define o plano técnico
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │  💻 Developer         │   implementa seguindo
              │                       │   o plano
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │  ✅ QA Engineer        │   revisa tudo e
              │                       │   faz o commit
              └───────────┬───────────┘
                          ▼
                     📱 Você (Telegram)
              "✅ Feito — commit abc1234"
```

Cada "agente" é um especialista virtual com instruções próprias (ficam nos arquivos `agents/*.md` do plugin, e você pode editar para se adequar ao seu projeto).

---

## 📋 Antes de começar: o que você precisa ter

### 1. Um computador com terminal

Linux, macOS ou Windows (via WSL). Se você não sabe o que é terminal, procure "como abrir o terminal no [seu sistema]" no Google — é um programa que vem pré-instalado.

### 2. Claude Code instalado

É o programa principal. No terminal:

```bash
npm install -g @anthropic-ai/claude-code
```

> **Não tem `npm`?** Primeiro instale o Node.js em [nodejs.org](https://nodejs.org) (a versão LTS basta).

Depois disso, você deve conseguir rodar `claude` no terminal. A primeira vez ele pede para fazer login na sua conta Anthropic.

### 3. Bun instalado

O Forge roda em cima do Bun (um runtime JavaScript parecido com Node mas mais rápido).

```bash
curl -fsSL https://bun.sh/install | bash
```

Feche e abra o terminal de novo. Teste com `bun --version` — deve mostrar um número.

### 4. Conta no Telegram

Qualquer conta normal serve. Se você não tem, instale o Telegram e faça uma.

---

## 🚀 Instalação passo a passo

### Passo 1 — Criar um bot no Telegram

Um "bot" no Telegram é uma conta automatizada que você controla por código. O Forge precisa de um bot para funcionar como seu canal de comunicação.

1. No Telegram, procure por **@BotFather** (o nome oficial do "criador de bots" do Telegram).
2. Mande a mensagem `/newbot` para ele.
3. Ele vai perguntar dois nomes:
   - **Nome do bot** — aparece nas conversas. Pode ser qualquer coisa, ex.: `Meu Backend`.
   - **Username** — o @ do bot. Tem que terminar em `bot`. Ex.: `meu_backend_forge_bot`.
4. Ele responde com uma mensagem contendo o **token** do bot. Parece com isso:

   ```
   7391204856:AAHfiqksKZ8WBjkL9mXn2pQ3rVtYwUeE1Fg
   ```

5. **Guarde esse token.** É a senha do seu bot. Não compartilhe com ninguém — quem tiver esse token controla seu bot.

> 💡 **Dica:** se você trabalha com vários projetos, crie **um bot por projeto**. Facilita separar as conversas (um chat para backend, outro para mobile, etc.).

---

### Passo 2 — Instalar o Forge no Claude Code

1. Abra o terminal e rode `claude` (entra no Claude Code).
2. Dentro dele, digite:

   ```
   /plugins
   ```

3. Escolha a opção de adicionar um "marketplace" e cole o endereço deste repositório:

   ```
   https://github.com/Guilhermevang/Forge-Plugin.git
   ```

4. O Claude Code lista o plugin **Forge** disponível. Habilite.

Pronto — o plugin está instalado. Ele ainda não está ativo em nenhum canal; isso é o próximo passo.

---

### Passo 3 — Configurar um canal para seu projeto

Um "canal" no Forge é a ligação entre **um projeto** e **um bot do Telegram**. Você precisa configurar um canal para cada projeto que quiser usar com o Forge.

1. No terminal, entre na pasta do seu projeto:

   ```bash
   cd ~/meus-projetos/backend
   ```

2. Abra o Claude Code:

   ```bash
   claude
   ```

3. Dentro do Claude Code, rode:

   ```
   /forge:configure backend 7391204856:AAHfiqksKZ8WBjkL9mXn2pQ3rVtYwUeE1Fg
   ```

   - O primeiro argumento (`backend`) é o **nome do canal** — use algo descritivo, que faça sentido para você. Exemplos: `api`, `frontend`, `mobile`, `site-loja`.
   - O segundo é o **token** que o BotFather te deu no Passo 1.

O Forge então:

- Salva o token num arquivo seguro em `~/.claude/channels/backend/.env` (só você tem acesso — `chmod 600`).
- Cria um arquivo `.claude/forge-channel` no seu projeto apontando para esse canal.
- Gera um script `forge` no seu shell que você vai usar para abrir o Claude Code com o canal ligado.

4. **Feche o terminal e abra de novo** (isso faz o shell carregar o novo script `forge`).

5. Volte para a pasta do projeto e rode:

   ```bash
   forge backend
   ```

   Esse é o comando que você vai usar daqui pra frente para abrir o Claude Code com o canal do Telegram conectado.

---

### Passo 4 — Parear seu Telegram (autorizar seu número)

Por segurança, o bot não aceita mensagens de qualquer um. Você precisa provar que é o dono — isso se chama **pareamento**.

**4.1 — No Telegram, mande qualquer mensagem para o seu bot.**

Pode ser só "oi". Ele responde com:

```
Pareamento necessário — execute no Claude Code:

/forge:access backend pair a3f9c2
```

**4.2 — Copie esse comando e rode no Claude Code:**

```
/forge:access backend pair a3f9c2
```

**4.3 — Alguns segundos depois, o bot confirma no Telegram:**

```
Pareado! Pode mandar suas tarefas.
```

Pronto — seu Telegram está autorizado. Só você pode mandar tarefas para esse bot.

> 🔒 **Recomendação de segurança:** depois de parear, rode também:
>
> ```
> /forge:access backend policy allowlist
> ```
>
> Isso "tranca" o canal: ninguém mais consegue se parear por conta própria. Você ainda pode adicionar outras pessoas manualmente depois se quiser (veja [Gerenciando o acesso](#-gerenciando-o-acesso)).

---

### Passo 5 — Mandar sua primeira tarefa

Com tudo configurado, agora é só usar. Mande uma mensagem de texto normal para o seu bot. Exemplos:

> "Cria um arquivo `utils/formatDate.ts` que exporta uma função `formatDate(date: Date): string` retornando o formato `DD/MM/YYYY`."

> "No módulo de usuários, adiciona um campo `apelido` opcional no schema. Não precisa de migração agora, só o tipo e a validação."

> "Aquele bug onde a listagem dá erro quando o filtro vem vazio — corrige isso."

O bot reage com 👀 quando recebe. Enquanto trabalha, você pode continuar sua vida. Quando termina, chega:

```
✅ Feito!

Criei utils/formatDate.ts com a função formatDate().
Commit: feat: add formatDate utility (abc1234f)
```

Se o Product Owner tiver alguma dúvida crítica (ex.: você pediu "valida o CPF" mas não especificou se aceita pontos/traços), ele pergunta pelo próprio Telegram e espera sua resposta antes de seguir.

---

## 🗂 Trabalhando com vários projetos

O Forge foi pensado para **um bot por projeto**. Você cria um bot diferente no BotFather para cada projeto, e roda `/forge:configure` **dentro da pasta de cada um**:

```bash
cd ~/code/backend   && claude   # depois: /forge:configure backend  7391...
cd ~/code/frontend  && claude   # depois: /forge:configure frontend 8802...
cd ~/code/mobile    && claude   # depois: /forge:configure mobile   9913...
```

Depois, para trabalhar em cada um, basta entrar na pasta e rodar `forge <nome-do-canal>`:

```bash
cd ~/code/frontend
forge frontend
```

Quer ver todos os canais que você configurou?

```
/forge:configure
```

---

## 📝 O arquivo `CLAUDE.md` — o mapa do seu projeto

O **CLAUDE.md** é um arquivo que fica na raiz do seu projeto e descreve para a IA qual é a stack, as convenções, e o que **não** fazer. O Forge lê esse arquivo antes de planejar e implementar qualquer coisa, então quanto melhor ele for, melhor o resultado.

Sem `CLAUDE.md` o Forge ainda funciona, mas pode gerar código que não combina com o resto do projeto (usar a lib errada, quebrar um padrão).

Exemplo simples:

```markdown
# Meu Projeto

## Stack

- Backend: NestJS + TypeScript + PostgreSQL
- ORM: TypeORM com migrations
- Testes: Jest

## Convenções

- Controllers ficam em `src/modules/<nome>/<nome>.controller.ts`
- Commits seguem Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- Sem uso de `any` em TypeScript — prefira `unknown` quando necessário

## O que NÃO fazer

- Não gerar migrations automaticamente — eu faço manualmente
- Não usar `console.log` em código de produção (use o logger do projeto)
```

Para gerar um `CLAUDE.md` automaticamente com base no seu projeto, use o comando do Claude Code:

```
/init
```

---

## ⚡ Modo `edit` vs `ask` — controle de autonomia

Por padrão, o Claude Code pergunta antes de editar arquivos, rodar comandos destrutivos, etc. Isso pode ficar cansativo quando você está fora (cada permissão precisa ser respondida pelo celular).

O Forge tem dois modos:

- **`ask`** (padrão) — Claude pergunta cada permissão via Telegram (botão ✅/❌). Mais seguro.
- **`edit`** — Claude edita/cria arquivos livremente sem perguntar. Mais ágil, exige confiança.

Para trocar o modo, mande para o bot:

```
/mode edit
```

ou

```
/mode ask
```

> ⚠️ **Importante:** o modo só entra em vigor na **próxima sessão** (próxima vez que você rodar `forge <canal>`). A sessão atual continua no modo antigo.

---

## 🔐 Gerenciando o acesso

Você controla quem pode mandar tarefas ao seu bot via skill `/forge:access`.

| Comando                                        | O que faz                                                    |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `/forge:access`                                | Mostra visão geral de todos os canais                        |
| `/forge:access <canal>`                        | Mostra detalhes (políticas, pareados, pendentes) de um canal |
| `/forge:access <canal> pair <código>`          | Aprova um pareamento pendente                                |
| `/forge:access <canal> deny <código>`          | Rejeita um pareamento pendente                               |
| `/forge:access <canal> allow <id-telegram>`    | Adiciona alguém pelo ID do Telegram                          |
| `/forge:access <canal> remove <id-telegram>`   | Remove alguém da allowlist                                   |
| `/forge:access <canal> policy pairing`         | Aceita pareamentos novos (modo padrão)                       |
| `/forge:access <canal> policy allowlist`       | "Tranca" — só quem já está na lista pode mandar              |
| `/forge:access <canal> policy disabled`        | Desliga o canal completamente                                |

### Regra de ouro de segurança

A aprovação de pareamentos **só pode** vir de você no terminal (Claude Code). O bot **nunca** aceita comandos de autorização vindos do Telegram — isso seria uma brecha enorme (alguém que invadisse o bot poderia se auto-adicionar).

---

## 🔊 Voz do Reporter (TTS)

No fim de cada tarefa, o Reporter pode mandar — além da mensagem de texto — um **áudio humanizado** resumindo o que foi feito. É opcional e configurável por canal. Gerenciado pela skill `/forge:voice`.

### Engines disponíveis

| Engine  | Qualidade | Rede      | Tamanho  | Quando usar                                            |
| ------- | --------- | --------- | -------- | ------------------------------------------------------ |
| `edge`  | Boa       | Online    | ~10 MB   | **Default.** Rápido, zero configuração, Azure Neural. |
| `piper` | Muito boa | Offline   | ~60 MB/voz | Voz mais natural, roda em CPU local, sem API.       |
| `none`  | —         | —         | —        | Desliga o áudio (só texto).                            |

### Começo rápido

Primeira coisa: ver o que está instalado e como cada canal está:

```
/forge:voice
```

Isso mostra: engines instaladas no host (edge-tts, piper, ffmpeg), vozes Piper baixadas, e a config de voz de cada canal.

### Usar Edge (default, mais simples)

```
/forge:voice install edge      # instala a CLI edge-tts (via pipx)
/forge:voice use edge          # ativa no canal pinado
/forge:voice set voice pt-BR-ThalitaMultilingualNeural
/forge:voice test              # smoke test — sintetiza "olá, teste"
```

Vozes pt-BR mais naturais no Edge: `pt-BR-ThalitaMultilingualNeural` (F), `pt-BR-AntonioNeural` (M), `pt-BR-FranciscaNeural` (F, default histórico).

### Usar Piper (offline, mais natural)

```
/forge:voice install piper             # instala piper-tts + baixa voz default (pt_BR-faber-medium)
/forge:voice use piper                 # ativa no canal pinado
/forge:voice test
```

Pra trocar a voz do Piper:

```
/forge:voice list                      # mostra catálogo + vozes instaladas
/forge:voice download pt_BR-cadu-medium
/forge:voice set voice pt_BR-cadu-medium
```

**Extra (opcional):** instale `ffmpeg` (`sudo apt install ffmpeg`) e defina `FORGE_TTS_PIPER_FORMAT=ogg` no `.env` do canal pra mandar o áudio como voice note nativo do Telegram em vez de arquivo WAV.

### Tabela de comandos

| Comando                                              | O que faz                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `/forge:voice`                                       | Status geral: engines, vozes, config de cada canal            |
| `/forge:voice install edge`                          | Instala a CLI `edge-tts` (Microsoft)                          |
| `/forge:voice install piper`                         | Instala `piper-tts` + baixa a voz default pt-BR               |
| `/forge:voice use edge`                              | Usa Edge no canal pinado                                      |
| `/forge:voice use piper`                             | Usa Piper no canal pinado (valida instalação + modelo)        |
| `/forge:voice use none`                              | Desliga áudio no canal (só texto)                             |
| `/forge:voice set voice <nome>`                      | Define a voz do canal (ex: `pt-BR-AntonioNeural`, `pt_BR-faber-medium`) |
| `/forge:voice list`                                  | Lista catálogo Piper + vozes Edge recomendadas + já instaladas |
| `/forge:voice download <voz>`                        | Baixa um modelo Piper (HuggingFace)                           |
| `/forge:voice remove <voz>`                          | Remove um modelo Piper do disco                               |
| `/forge:voice test`                                  | Smoke test: sintetiza uma frase e valida o arquivo            |
| `/forge:voice off` / `/forge:voice on`               | Desliga/liga o áudio no canal (atalho para `voiceReply`)      |
| `/forge:voice <canal> <comando>`                     | Mesmos comandos acima num canal específico                    |

### Como funciona por baixo dos panos

- **Escopo global (env):** `FORGE_TTS_PROVIDER`, `FORGE_TTS_EDGE_VOICE`, `FORGE_TTS_PIPER_VOICE`, `FORGE_TTS_PIPER_MODELS_DIR`, `FORGE_TTS_PIPER_FORMAT`. Valem pra todos os canais do host.
- **Escopo por canal (`~/.claude/channels/<nome>/access.json`):** campos `voiceProvider`, `voiceName`, `voiceReply`. Sobrescrevem o global. Relidos a cada mensagem — mudança tem efeito imediato sem reiniciar o `forge`.
- **Modelos Piper:** ficam em `~/.local/share/piper-voices/` (cada voz = `<nome>.onnx` + `<nome>.onnx.json`). Baixados sob demanda pela skill.

---

## 💬 Comandos do bot (dentro do Telegram)

| Comando   | O que faz                                                                    |
| --------- | ---------------------------------------------------------------------------- |
| `/start`  | Mostra instruções de como se parear                                          |
| `/help`   | Explica o que o bot faz (pipeline dos 4 agentes)                             |
| `/status` | Mostra se você está pareado ou pendente                                      |
| `/mode`   | Troca entre `edit` (autônomo) e `ask` (pergunta antes) — só para já pareados |

---

## ❓ Perguntas frequentes

**Posso usar o mesmo bot em vários projetos?**
Tecnicamente sim, mas não recomendo. Fica confuso porque todas as mensagens misturam em uma conversa só. Crie um bot para cada projeto.

**Preciso deixar o computador ligado?**
Sim — o Forge roda localmente na sua máquina. Se desligar o PC, o bot para de responder. Para soluções "24/7" você precisaria rodar numa VPS, o que foge do escopo desse README.

**Meu código vai para a nuvem da Anthropic?**
Apenas o que o Claude precisa para trabalhar (arquivos que ele lê para entender o contexto, diffs que ele gera). Não é um sync do repo inteiro. Veja a [política de privacidade da Anthropic](https://www.anthropic.com/privacy) para detalhes.

**E se o Claude fizer besteira no meu código?**
Todo trabalho do Forge termina com um `git commit`. Se ficou ruim, é só reverter:

```bash
git revert HEAD
```

Em modo `ask` você aprova cada ação antes. Em modo `edit` ele roda mais livre — por isso é bom começar com `ask` até ganhar confiança.

**Posso desativar temporariamente?**
Sim: `/forge:access <canal> policy disabled` trava o canal até você reativar. Para religar: `/forge:access <canal> policy allowlist`.

**O Forge funciona com grupos do Telegram?**
Funciona — você pode configurar grupos específicos via `/forge:access`. Útil para times. Por padrão, o bot só responde em DMs.

---

## 🛠 Quando algo dá errado

### O bot não responde às minhas mensagens

1. O canal está registrado? Rode `/forge:configure` e veja se aparece.
2. O plugin está ativo? Rode `/plugins` e verifique se Forge aparece como `Enabled`.
3. Você abriu o Claude Code com `forge <canal>`? Sem isso, o bot não está escutando.
4. Você está pareado? Mande `/status` para o bot no Telegram.

### "chat X não está na allowlist"

A política do canal está `allowlist` e seu Telegram ID não foi adicionado. Solução:

```
/forge:access <canal> policy pairing    # volta a aceitar pareamentos
```

Depois mande uma mensagem ao bot, copie o código, aprove com `/forge:access <canal> pair <código>` e finalmente:

```
/forge:access <canal> policy allowlist  # trava de novo
```

### "409 Conflict" nos logs

Alguma sessão anterior não encerrou corretamente e está segurando o canal. O Forge geralmente resolve sozinho. Se persistir:

```bash
pkill -f "bun server.ts"
```

Aí rode `forge <canal>` de novo.

### Quero desfazer o último commit que o Forge fez

```bash
git revert HEAD
```

Cria um novo commit desfazendo o anterior (mantém histórico). Se preferir apagar mesmo (não recomendado se já deu push):

```bash
git reset --hard HEAD~1
```

---

## 🏛 Entendendo a arquitetura (para curiosos e devs)

### Estrutura do plugin

```
forge/
├── server.ts                 ← entrypoint (shim que importa src/index.ts)
├── src/
│   ├── index.ts              ← bootstrap
│   ├── app.ts                ← ForgeApp — composition root (cria tudo)
│   ├── core/                 ← tipos, config, constantes, versão
│   ├── access/               ← controle de acesso, pairing, modo
│   ├── telegram/             ← bot grammy + handlers (commands, callbacks, messages/)
│   │   └── handlers/messages/
│   │       ├── pipeline.ts   ← núcleo comum (gate → permissão → notificar MCP)
│   │       ├── text.ts       ← handler de texto
│   │       ├── photo.ts      ← handler de foto (+ download)
│   │       ├── document.ts   ← handler de documento
│   │       └── voice.ts      ← handler de voz (rejeita)
│   ├── mcp/                  ← servidor MCP + 4 tools (reply, react, edit, download)
│   └── lifecycle/            ← shutdown + watchdog de processo órfão
├── agents/                   ← instruções de PO, TL, Dev, QA (markdown editável)
├── skills/                   ← /forge:configure, /forge:access (interface no Claude)
└── docs/diagrams/            ← PlantUML com a arquitetura em detalhe
```

### Estado em disco

**Global (por canal):**

```
~/.claude/channels/<nome>/
  .env              ← FORGE_BOT_TOKEN (chmod 600)
  access.json       ← allowlist, política, códigos pendentes
  mode              ← 'edit' ou 'ask'
  bot.pid           ← PID do poller atual (evita 409 Conflict)
  approved/         ← marcadores efêmeros de pareamento aprovado
  inbox/            ← fotos/documentos baixados do Telegram
```

**Por projeto:**

```
<seu-repo>/.claude/forge-channel    ← nome do canal deste projeto
```

### Tecnologias

- **Bun** — runtime JS/TS rápido, executa `.ts` direto sem compilação.
- **grammy** — biblioteca para Telegram Bot API (TypeScript).
- **@modelcontextprotocol/sdk** — SDK do protocolo MCP (a "linguagem" que o Claude Code usa para conversar com plugins externos).
- **Zod** — validação de schemas de entrada das tools MCP.

### Diagramas detalhados

Os diagramas em [`docs/diagrams/`](docs/diagrams/) mostram a arquitetura, fluxo dos 4 agentes, fluxo de pareamento e máquina de estados do gating de mensagens. Renderizam com qualquer ferramenta PlantUML.

### Versionamento

A versão é mantida sincronizada entre `package.json`, `.claude-plugin/plugin.json` e o `MCP server` (runtime). Para bumpar:

```bash
bun run bump 1.4.0
```

---

## 📜 Licença

Apache-2.0 — veja o arquivo `LICENSE`.

## 🤝 Contribuindo

Issues e PRs são bem-vindos. Antes de mandar código novo:

1. Rode `bun run typecheck` — deve passar sem erro.
2. Teste o fluxo completo (pairing + mandar uma tarefa).
3. Se mudar a arquitetura, atualize os diagramas em `docs/diagrams/`.
