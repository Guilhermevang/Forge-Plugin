# Forge — Diagramas de arquitetura

Diagramas PlantUML descrevendo a arquitetura do plugin Forge. Todos validam com `plantuml -checkonly`. Renderize com a extensão PlantUML do VS Code, com `plantuml file.puml`, ou com o [servidor online](https://www.plantuml.com/plantuml).

## Índice

| # | Arquivo | Tipo | O que mostra |
|---|---------|------|--------------|
| 0 | [00-system-design.puml](00-system-design.puml) | Arquitetura geral | **Visão consolidada** — atores, Telegram, processo `server.ts` com seus pacotes internos (access, telegram, mcp, lifecycle), filesystem de estado e Claude Code. Comece por aqui. |
| 1 | [01-sequence-dev-flow.puml](01-sequence-dev-flow.puml) | Sequência | Pipeline **PO → Tech Lead → Developer → QA** disparado por uma tarefa de desenvolvimento. Inclui perguntas do PO e loop QA↔Dev. |
| 2 | [02-sequence-pairing.puml](02-sequence-pairing.puml) | Sequência | Fluxo de **autorização** do remetente: geração de código, aprovação via `/forge:access` no terminal, watcher de `approved/`. |
| 3 | [03-state-gating.puml](03-state-gating.puml) | Estados | Máquina de estados que cada mensagem entrante percorre, cobrindo DM com as três políticas (`disabled`, `allowlist`, `pairing`) e regras de grupo/menção. |

## Glossário rápido

- **Canal Forge** — diretório `~/.claude/channels/<nome>/` com token, política de acesso e estado de um bot Telegram dedicado.
- **Launcher `forge`** — função injetada no shell (`forge <canal>`) que exporta `FORGE_CHANNEL` e inicia `claude` com o plugin carregado e o `permission-mode` conforme o arquivo `mode`.
- **Gate** — função em [src/access/gate.ts](../../src/access/gate.ts) que decide, para cada update do Telegram, se a mensagem é entregue ao Claude, inicia pairing ou é descartada.
- **InboundPipeline** — classe em [src/telegram/handlers/messages/pipeline.ts](../../src/telegram/handlers/messages/pipeline.ts) que centraliza gate → resposta de permissão → envio da notificação MCP. Cada handler por modalidade (texto, foto, documento...) delega a ela.
- **Tools MCP** — `forge_reply`, `forge_react`, `forge_edit_message`, `forge_download_attachment` — registradas via `McpServer.registerTool` em [src/mcp/tools/](../../src/mcp/tools/). São a única via de saída do Claude para o Telegram.
- **4 agentes** — subagentes definidos em [agents/*.md](../../agents/), spawned em sequência apenas para tarefas de desenvolvimento concretas.

## Pontos de atenção arquiteturais

1. **1 processo `server.ts` por canal** — o PID é gravado em `bot.pid` para evitar 409 Conflict do Telegram (apenas um poller por token).
2. **Aprovação só no terminal** — a skill `/forge:access` é o único caminho legítimo para aceitar pairings; o bot nunca aceita instruções de autorização vindas via Telegram (vetor de injeção).
3. **Token protegido** — `.env` do canal é `chmod 600` e ficam fora do `.mcp.json`.
4. **Chunking inteligente** — respostas são cortadas por `\n` (ou limite rígido) antes de `sendMessage` (Telegram aceita até 4096 chars).
5. **Modo edit vs ask** — controlado pelo arquivo `mode`; afeta `--permission-mode` do Claude Code no launcher, não o próprio servidor.
6. **Sem estado por projeto** — o estado é global em `~/.claude/channels/<nome>/`; o working dir só contém código, `CLAUDE.md` e `.claude/forge-channel` apontando para o canal.
7. **Composition root único** — [src/app.ts](../../src/app.ts) é o único lugar que instancia classes. Todos os outros módulos recebem dependências por construtor (sem singletons espalhados, sem DI container).
