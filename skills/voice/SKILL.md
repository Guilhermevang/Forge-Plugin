---
name: voice
description: Gerencia o TTS (text-to-speech) dos canais Forge — escolhe engine (Edge/Piper), instala backends, baixa vozes, testa síntese e edita overrides por canal. Use quando o usuário quiser configurar áudio, trocar voz, instalar Piper, baixar modelo novo ou desativar voz em um canal.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(rm *)
  - Bash(cat *)
  - Bash(command -v *)
  - Bash(which *)
  - Bash(test *)
  - Bash(stat *)
  - Bash(du *)
  - Bash(chmod *)
  - Bash(pipx *)
  - Bash(pip *)
  - Bash(pip3 *)
  - Bash(python3 *)
  - Bash(edge-tts *)
  - Bash(piper *)
  - Bash(ffmpeg *)
  - Bash(curl *)
  - Bash(wget *)
---

# /forge:voice — Configuração de TTS dos Canais Forge

Esta skill é **o único lugar** onde o TTS é configurado. A skill `/forge:configure` não mexe mais em voz — canal novo nasce com a engine default disponível; trocar engine, instalar Piper, baixar vozes, ou desativar áudio em um canal são feitos aqui.

Argumentos recebidos: `$ARGUMENTS`

---

## Conceitos

- **Engine (provider):** o backend de síntese. Dois suportados hoje:
  - `edge` — Microsoft Edge-TTS. CLI Python, online, sem API key. Vozes neurais Azure. Instalação rápida, ~10MB. **Default do plugin.**
  - `piper` — Piper TTS. Neural offline, open-source, roda em CPU. Cada voz é um modelo `.onnx` baixado separadamente (~60MB cada). Mais natural que Edge em pt-BR; independe de rede.
  - `none` — desativa TTS (o tool `forge_reply_voice` retorna silenciosamente sem enviar áudio).
- **Voice:** identificador da voz dentro de uma engine. Formatos distintos por engine:
  - Edge: `pt-BR-FranciscaNeural`, `pt-BR-AntonioNeural`, `pt-BR-ThalitaMultilingualNeural`...
  - Piper: `pt_BR-faber-medium`, `pt_BR-cadu-medium`, `en_US-lessac-medium`...
- **Escopo:**
  - **Global (env):** `FORGE_TTS_PROVIDER`, `FORGE_TTS_EDGE_VOICE`, `FORGE_TTS_PIPER_VOICE`, `FORGE_TTS_PIPER_FORMAT`, `FORGE_TTS_PIPER_MODELS_DIR`. Valem pra todos os canais do host.
  - **Por canal (`~/.claude/channels/<nome>/access.json`):** campos `voiceProvider`, `voiceName`, `voiceReply`. Sobrescrevem o global.
  - **Precedência:** argumento do tool → `access.voiceProvider/voiceName` → default do service (env).
- **Modelos Piper:** ficam em `~/.local/share/piper-voices/` (ou o que `FORGE_TTS_PIPER_MODELS_DIR` apontar). Cada voz = dois arquivos: `<nome>.onnx` + `<nome>.onnx.json`.

---

## Resolução do canal alvo

Igual à skill `/forge:access`. Parse `$ARGUMENTS`:

1. Se o primeiro token for um comando conhecido (`status`, `use`, `install`, `download`, `list`, `remove`, `test`, `set`, `off`, `on`), o canal alvo é inferido:
   - Leia `./.claude/forge-channel` no cwd. Se existir, use.
   - Senão, liste `~/.claude/channels/`. Se houver exatamente um, use-o.
   - Se houver vários e nenhum pinado, peça o nome: `/forge:voice <canal> <comando>`.
   - Se nenhum canal existir, oriente a usar `/forge:configure` primeiro.
2. Se o primeiro token não for comando conhecido, trate como `<canal>` e o resto como subcomando.

Comandos que **não precisam de canal** (só afetam o host): `install <engine>`, `download <voice>`, `remove <voice>`, `list`. Esses rodam mesmo sem canal selecionado.

---

## Dispatch por subcomando

### sem argumentos OU `status` — panorama

1. Rode em paralelo: `command -v edge-tts`, `command -v piper`, `command -v ffmpeg`.
2. Liste modelos Piper instalados: `ls ~/.local/share/piper-voices/*.onnx 2>/dev/null`. Pra cada um, extraia o nome curto (sem extensão) e o tamanho (`stat`).
3. Para cada canal em `~/.claude/channels/`, leia `access.json` e extraia `voiceProvider`, `voiceName`, `voiceReply`.
4. Mostre:
   ```
   🔊 Engines no host:
     edge-tts  ✅ <path>     (ou ❌ não instalado)
     piper     ✅ <path>     (ou ❌ não instalado)
     ffmpeg    ✅ <path>     (opcional, só pra Piper em OGG)

   🎙️ Vozes Piper instaladas (N):
     pt_BR-faber-medium       63 MB
     en_US-lessac-medium      63 MB

   📡 Canais (provider / voz / ativo):
     backend      edge   pt-BR-FranciscaNeural     ✅
     dropflux     piper  pt_BR-faber-medium        ✅
     mobile       —      (default)                 🔇 voiceReply=false
   ```
5. Se algo estiver incongruente (canal com `voiceProvider=piper` mas Piper não instalado, ou apontando pra voz ausente), sinalize com um aviso no fim e proponha o comando pra corrigir.

---

### `use <engine>` — trocar engine do canal alvo

`<engine>` ∈ `edge` | `piper` | `none`.

1. Valide `<engine>`. Se inválido, liste as opções e pare.
2. Se `<engine> = piper`, verifique pré-requisitos:
   - `command -v piper`. Se ausente, pergunte: _"Piper não está instalado. Instalo agora? (s/n)"_ Se sim, execute o fluxo `install piper` (abaixo) antes de continuar; se não, pare informando.
   - Verifique se há pelo menos um modelo em `~/.local/share/piper-voices/`. Se não houver, pergunte qual baixar (mostre o catálogo de `list`) e rode `download <voice>` antes de continuar.
3. Edite `~/.claude/channels/<canal>/access.json`:
   - Carregue (ou crie com defaults se ausente).
   - Set `voiceProvider = <engine>`.
   - Se `<engine> = piper` e `voiceName` atual for de Edge (começa com `pt-BR-` ou contém `Neural`), **limpe** `voiceName` — o service cairá no default do Piper. Oriente o usuário a escolher voz explícita via `set voice <nome>` se quiser.
   - Se `<engine> = edge` e `voiceName` atual for de Piper (contém `_`, ex: `pt_BR-...`), limpe igualmente.
   - Se `<engine> = none`, mantenha os outros campos — `voiceProvider=none` já basta pra desativar.
   - Escreva com `JSON.stringify(obj, null, 2)` + newline final, modo 0600.
4. Confirme: _"Canal `<canal>` agora usa engine `<engine>`, voz `<voiceName ou default>`. Mudança vale na próxima mensagem — access.json é relido a cada requisição."_

---

### `install <engine>` — instalar backend no host

`<engine>` ∈ `edge` | `piper`.

**Fluxo comum:**
1. `command -v <engine>` (`edge-tts` ou `piper`). Se já existe, avise e pule.
2. Detecte instalador na ordem: `pipx` → `pip3 --user` → `pip --user`. Se nenhum, oriente instalar Python+pipx e pare.
3. Peça confirmação: _"Vou instalar `<engine>` via `<instalador>`. Prosseguir? (s/n)"_
4. Se sim, rode:
   - edge: `pipx install edge-tts` (ou fallback pip)
   - piper: `pipx install piper-tts` (ou fallback pip)
   Capture stdout+stderr. Se falhar com "externally-managed-environment" (PEP 668), recomende pipx explicitamente.
5. Revalide `command -v`. Se ainda ausente, avise sobre PATH (`~/.local/bin`; sugerir `pipx ensurepath` + reabrir terminal).
6. **Piper extra:** após instalar, se não houver modelo em `~/.local/share/piper-voices/`, pergunte se quer baixar a voz default (`pt_BR-faber-medium`, ~63MB). Se sim, rode `download pt_BR-faber-medium`.
7. **ffmpeg (opcional para Piper em OGG):** se Piper está instalado mas `ffmpeg` não, mencione no fim: _"Opcional: instale `ffmpeg` pra enviar áudios Piper como voice note nativo do Telegram (formato OGG/Opus). Sem ffmpeg, áudios saem como WAV — funciona, mas aparece como arquivo. No Ubuntu/Debian: `sudo apt install ffmpeg`."_

---

### `download <voice>` — baixar modelo Piper

1. Valide o nome — deve bater com um dos modelos do catálogo (abaixo) **ou** ser um nome custom com a URL fornecida pelo usuário.
2. Resolva a URL a partir do catálogo. Estrutura oficial:
   `https://huggingface.co/rhasspy/piper-voices/resolve/main/<lang>/<lang_REGION>/<speaker>/<quality>/<voice>.onnx`
   e mesmo path pro `.onnx.json`. Exemplo `pt_BR-faber-medium`:
   - `https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx`
   - `https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json`
3. Garanta `~/.local/share/piper-voices/` (ou o dir configurado) com `mkdir -p`.
4. Peça confirmação com o tamanho estimado (ver catálogo).
5. Baixe com `curl -L --fail -o <dest> <url>` (ou `wget` como fallback). Os dois arquivos. Se falhar, limpe parciais com `rm -f`.
6. Valide: `test -s <path>.onnx && test -s <path>.onnx.json`. Mostre o tamanho final.
7. Mensagem: _"Voz `<voice>` baixada. Pra usá-la neste canal: `/forge:voice use piper` e depois `/forge:voice set voice <voice>`."_

**Catálogo curado** (exponha ao usuário em `list` ou quando perguntarem):

| voice                        | idioma | sexo | tamanho |
|------------------------------|--------|------|---------|
| `pt_BR-faber-medium`         | pt-BR  | M    | ~63 MB  |
| `pt_BR-cadu-medium`          | pt-BR  | M    | ~63 MB  |
| `pt_BR-edresson-low`         | pt-BR  | F    | ~25 MB  |
| `en_US-lessac-medium`        | en-US  | F    | ~63 MB  |
| `en_US-ryan-medium`          | en-US  | M    | ~63 MB  |
| `en_US-amy-medium`           | en-US  | F    | ~63 MB  |

Caminhos HuggingFace correspondentes:
- faber → `pt/pt_BR/faber/medium/`
- cadu → `pt/pt_BR/cadu/medium/`
- edresson → `pt/pt_BR/edresson/low/`
- lessac → `en/en_US/lessac/medium/`
- ryan → `en/en_US/ryan/medium/`
- amy → `en/en_US/amy/medium/`

Para vozes fora do catálogo, peça ao usuário a URL `.onnx` (e a `.onnx.json` ao lado) ou oriente navegar em https://huggingface.co/rhasspy/piper-voices/tree/main.

---

### `list` — listar vozes

1. **Piper instaladas:** `ls ~/.local/share/piper-voices/*.onnx` → nome curto + tamanho.
2. **Piper disponíveis no catálogo:** mostre a tabela acima, marcando ✅ as já instaladas.
3. **Edge (pt-BR, recomendadas):**
   - `pt-BR-FranciscaNeural` (F, default histórico)
   - `pt-BR-AntonioNeural` (M, expressiva)
   - `pt-BR-ThalitaNeural` (F)
   - `pt-BR-ThalitaMultilingualNeural` (F, multilingue — mais natural)
   - Para listar todas: `edge-tts --list-voices | grep pt-BR`

---

### `remove <voice>` — remover modelo Piper

1. Resolva o path: `~/.local/share/piper-voices/<voice>.onnx` (+ `.onnx.json`).
2. Verifique se algum canal usa essa voz (`voiceName` em qualquer `access.json`). Se sim, avise e peça confirmação explícita.
3. Confirme: _"Vou deletar <voice> (~NN MB). Prosseguir? (s/n)"_
4. `rm -f <path>.onnx <path>.onnx.json`.
5. Confirme.

---

### `test` — smoke test da config do canal

1. Leia `access.json` do canal alvo.
2. Resolva provider e voz (como o service faria): `access.voiceProvider` ou `FORGE_TTS_PROVIDER` (default `edge`); `access.voiceName` ou env correspondente.
3. Se `voiceReply=false`, avise e pare.
4. Execute o backend equivalente:
   - edge: `edge-tts --voice <voz> --text "olá, teste do Forge" --write-media /tmp/forge-voice-test.mp3`
   - piper: `echo "olá, teste do Forge" | piper --model ~/.local/share/piper-voices/<voz>.onnx --output_file /tmp/forge-voice-test.wav`
5. Valide: `test -s /tmp/forge-voice-test.*` e mostre tamanho. Não toque áudio — só confirma que a síntese funciona.
6. Mensagem final resumindo engine, voz, arquivo gerado.

---

### `set voice <voz>` — mudar voz do canal

1. Valide que a voz bate com a engine ativa do canal (ou com o default):
   - Edge: começa com `<lang>-<region>-` e termina em `Neural` (aviso se formato parecer errado, mas aceite).
   - Piper: verifica se `~/.local/share/piper-voices/<voz>.onnx` existe. Se não, pergunte se quer baixar (dispara `download <voz>`).
2. Edite `access.json`, set `voiceName = <voz>`.
3. Confirme.

---

### `off` / `on` — desativar/ativar voz no canal

- `off` → set `voiceReply = false` em `access.json`.
- `on` → set `voiceReply = true` (ou remove o campo — o default é habilitado).

Confirme e lembre que a mudança vale na próxima mensagem.

---

## Variáveis de ambiente (em `~/.claude/channels/<nome>/.env` ou globais)

- `FORGE_TTS_PROVIDER` = `edge` | `piper` | `none` — engine default.
- `FORGE_TTS_EDGE_VOICE` = voz default do Edge (fallback pra `FORGE_TTS_VOICE`).
- `FORGE_TTS_PIPER_VOICE` = voz default do Piper.
- `FORGE_TTS_PIPER_MODELS_DIR` = diretório onde os `.onnx` vivem. Default `~/.local/share/piper-voices`.
- `FORGE_TTS_PIPER_FORMAT` = `wav` (default) | `ogg`. OGG requer `ffmpeg` no PATH e vira voice note nativo no Telegram.

Overrides por canal em `access.json` têm precedência sobre qualquer env.

---

## Notas de implementação

- **Nunca sobrescreva `access.json`** — sempre leia, mute o campo específico, escreva de volta preservando o resto.
- **Atomicidade:** escreva em `access.json.tmp` + `chmod 600` + rename. (Ou use `Write` direto — o server relê a cada requisição, não há race crítica.)
- **Valide JSON:** se `access.json` estiver corrompido, não tente consertar — avise e pare. O server já tem fallback, mas não queremos perpetuar dados ruins.
- **Sem cache manual:** o service faz cache por `(provider, voice, rate, pitch, volume, text)`. Trocar voz invalida naturalmente.
- **Ordem nos comandos do usuário:** `use piper` é o passo pesado (instala backend + baixa modelo + edita access). Divida em confirmações explícitas, não faça tudo em silêncio.
