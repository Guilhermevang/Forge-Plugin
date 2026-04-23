# Backlog de ideias — Forge

Ordenado por **valor/esforço** (mais rápido e útil primeiro). Cada item tem um rascunho do escopo, riscos e refinamentos.

---

## 1. Entrada por áudio (voice note → tarefa)

**O quê:** quando o Telegram entregar uma voice/audio message, baixar o arquivo, transcrever, e alimentar o fluxo dos 5 agentes como se fosse texto.

**Por que é rápido e útil:**
- O Telegram já entrega voice notes como attachment — a infra de download já existe (`forge_download_attachment`).
- Desbloqueia uso mobile/hands-free (ditar tarefa caminhando, dirigindo, na cama).
- Não muda o fluxo de agentes — só adiciona um passo de pré-processamento.

**Esboço técnico:**
- Detectar `voice`/`audio` no update do Telegram.
- Transcrever via Whisper local (`whisper.cpp`) ou OpenAI/Groq API. Groq Whisper é quase grátis e muito rápido.
- Passar transcrição ao PO como se fosse a mensagem original; guardar o path do áudio como attachment da task para referência.
- Ecoar a transcrição via `forge_reply` antes de iniciar o fluxo ("entendi: ...") para o usuário corrigir se a transcrição falhou.

**Refinamentos:**
- Se confiança da transcrição < X, pedir confirmação antes de spawnar agentes.
- Suportar mistura (áudio + texto no mesmo thread).
- Guardar transcrições no log para retroalimentar um fine-tune futuro.

---

## 2. Resposta dupla: texto técnico + áudio humanizado

**O quê:** ao finalizar uma tarefa, além do `forge_reply` atual do Reporter, enviar um segundo bloco:
- **Texto:** explicação 100% técnica das mudanças (arquivos tocados, decisões, diffs relevantes).
- **Áudio:** versão humanizada, conversacional, do Reporter falando como se tivesse acabado de fazer o trampo.

**Por que vem depois do #1:**
- Depende de TTS confiável (ElevenLabs, OpenAI TTS, ou Kokoro local). Custo > do que STT.
- Valor alto mas não desbloqueia novos fluxos — só melhora a experiência.

**Esboço técnico:**
- Separar o Reporter em dois modos: `reporter-technical` (texto seco, estrutura fixa) e `reporter-voice` (tom humano, já existe hoje).
- Enviar texto via `forge_reply` e áudio via um novo `forge_reply_voice` (ou reutilizar attachment).
- Cache de TTS por hash do texto para não regenerar em re-envios.

**Refinamentos:**
- Flag por canal: `voice_reply: on/off` para quem não quer receber áudio.
- Legendas no áudio (transcrição embutida) para acessibilidade e busca.
- Persona de voz configurável por canal.
- Incluir no áudio um "teaser" (30s) e no texto o detalhe completo — áudio pra ouvir no corre, texto pra ler quando sentar.

---

## 3. Fila de tarefas sequenciais com commit + novo contexto por fase

**O quê:** usuário envia N tarefas de uma vez (ou uma tarefa grande já quebrada em fases). O Forge executa uma por vez: ao terminar, faz commit, **descarta o contexto**, e abre uma nova sessão Claude para a próxima. Ideal para deixar rodando durante a noite.

**Por que é o mais poderoso — e o mais complexo:**
- Valor gigantesco ("dormir com 10 tarefas na fila").
- Requer orquestração persistente, checkpointing, e isolamento de contexto entre fases.
- Precisa de guardrails fortes — um agente solto de madrugada pode fazer estrago.

**Esboço técnico:**
- **Fila persistente em disco** (`~/.forge/queue/<channel>.jsonl`) — sobrevive a reboot.
- **Orquestrador externo** (processo leve que lê a fila e dispara `claude -p` por fase, não um agente dentro do Claude).
- Cada fase roda em subprocesso novo → contexto zerado, sem drift nem poluição.
- Ao final de cada fase: `git commit` automático com mensagem padronizada, `forge_reply` com resumo, avança a fila.
- Ao final do lote: abrir PR automático (opcional) e mandar resumo consolidado ("enquanto você dormia: 8 tarefas concluídas, 2 paradas pedindo ajuda").

**Guardrails obrigatórios:**
- **Timeout por fase** (ex: 20 min) — se estourar, pausa e pede ajuda via Telegram.
- **Budget de tokens** por fase e por lote.
- **Pausa automática** se QA reprovar 2x seguidas.
- **Branch dedicado** (`forge/batch-<timestamp>`) — nunca commitar direto em main.
- **Dry-run obrigatório:** antes de começar, Forge responde com o plano da fila ("vou executar estas 10 fases, ok?") e espera confirmação.
- **Kill switch** via comando Telegram (`/forge stop`).

**Comandos de controle:**
- `/forge queue` — mostra fila atual e progresso.
- `/forge pause` / `/forge resume`.
- `/forge skip` — pula a fase atual.
- `/forge retry` — roda de novo a última.
- `/forge rollback` — reverte o último commit da fila.

**Refinamentos:**
- Dependências entre fases (DAG, não só lista).
- Relatório matinal: diff consolidado + lista do que travou.
- Integração com calendário: não rodar fora da janela permitida.
- Modo "revisão antes de commit" — pede OK via Telegram a cada fase em vez de autocommit.

---

## Ideias adjacentes (para pensar depois)

- **`/forge status` rico** — mostra qual agente está ativo, heartbeat, tempo decorrido.
- **Histórico consultável** — "qual foi a última tarefa de testes que rodamos?" respondido a partir do log.
- **Templates de tarefa** — "nova feature CRUD", "bugfix com teste de regressão" — PO preenche o scaffold em vez de começar do zero.
- **Auto-detecção de risco** — se a tarefa toca migrations/infra/auth, forçar confirmação humana antes do Developer rodar.
- **Modo "pair"** — Forge comenta em tempo real enquanto o usuário codifica, em vez de executar sozinho.
- **Métricas por canal** — quantas tarefas/semana, taxa de aprovação do QA, tempo médio por agente.
