# Forge — System Design

Diagramas PlantUML descrevendo a arquitetura do plugin Forge. Cada arquivo é independente e pode ser renderizado com qualquer renderizador PlantUML (VS Code PlantUML extension, `plantuml file.puml`, servidor online, etc.).

## Índice

| # | Arquivo | Tipo | O que mostra |
|---|---------|------|--------------|
| 1 | [01-context.puml](01-context.puml) | Contexto (C4 L1) | Atores externos (Usuário, Operador), Telegram, Forge e Repositório, com as fronteiras e canais de comunicação. |
| 2 | [02-components.puml](02-components.puml) | Componentes (C4 L3) | Estrutura interna do processo `server.ts` — transporte (grammy + MCP stdio), roteamento (gate/handlers), ferramentas MCP expostas, serviços auxiliares e o filesystem de estado. |
| 3 | [03-sequence-dev-flow.puml](03-sequence-dev-flow.puml) | Sequência | Pipeline PO → Tech Lead → Developer → QA disparado por uma tarefa de desenvolvimento, incluindo loop QA→Dev e perguntas do PO. |
| 4 | [04-sequence-pairing.puml](04-sequence-pairing.puml) | Sequência | Fluxo de autorização: geração de código, aprovação via `/forge:access` no terminal, watcher de `approved/`. |
| 5 | [05-deployment.puml](05-deployment.puml) | Implantação | Processos na máquina do operador (Shell + launcher, Claude Code, server.ts), layout em `~/.claude/` e ligação com Telegram Bot API. |
| 6 | [06-state-access.puml](06-state-access.puml) | Estados | Máquina de estados de cada mensagem entrante, cobrindo as três políticas (`disabled`, `allowlist`, `pairing`) e regras de grupo/menção. |

## Glossário rápido

- **Canal Forge**: diretório `~/.claude/channels/<nome>/` com token, política de acesso e estado de um bot Telegram dedicado.
- **Launcher `forge`**: função injetada no shell (`forge <canal>`) que exporta `FORGE_CHANNEL` e inicia `claude` com o plugin carregado e o `permission-mode` conforme o arquivo `mode`.
- **Gate**: função em `server.ts` que decide, para cada update do Telegram, se a mensagem é entregue ao Claude, inicia pairing ou é descartada.
- **Ferramentas MCP**: `forge_reply`, `forge_react`, `forge_edit_message`, `forge_download_attachment` — única via de saída do Claude para o Telegram.
- **4 agentes**: subagentes definidos em `agents/*.md`, spawned em sequência apenas para tarefas de desenvolvimento concretas.

## Pontos de atenção arquiteturais

1. **1 processo `server.ts` por canal** — o PID é gravado em `bot.pid` para evitar 409 Conflict do Telegram (apenas um poller por token).
2. **Aprovação só no terminal** — a skill `/forge:access` é o único caminho legítimo para aceitar pairings; o bot nunca deve aceitar instruções de autorização vindas via Telegram (vetor de injeção).
3. **Token protegido** — `.env` do canal é `chmod 600`.
4. **Chunking inteligente** — respostas são cortadas por `\n` (ou limite rígido) antes de `sendMessage` (Telegram aceita até 4096 chars).
5. **Modo edit vs ask** — controlado por arquivo `mode`; afeta `--permission-mode` do Claude Code no launcher, não o próprio servidor.
6. **Sem estado por projeto** — todo o estado é global (`~/.claude/`); o working directory só contém código e `CLAUDE.md`.
