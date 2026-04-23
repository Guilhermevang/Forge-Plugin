export function chunk(text: string, limit: number, mode: 'length' | 'newline'): string[] {
  if (text.length <= limit) return [text]
  const out: string[] = []
  let rest = text
  while (rest.length > limit) {
    let cut = limit
    if (mode === 'newline') {
      const para = rest.lastIndexOf('\n\n', limit)
      const line = rest.lastIndexOf('\n', limit)
      const space = rest.lastIndexOf(' ', limit)
      cut = para > limit / 2 ? para : line > limit / 2 ? line : space > 0 ? space : limit
    }
    out.push(rest.slice(0, cut))
    rest = rest.slice(cut).replace(/^\n+/, '')
  }
  if (rest) out.push(rest)
  return out
}

type OpenTag = { name: string; raw: string }

// Varre HTML do Telegram e devolve a pilha de tags ainda abertas ao fim da string.
// Ignora atributos: apenas extrai nome e raw para poder reabrir depois.
function openTagStack(html: string): OpenTag[] {
  const stack: OpenTag[] = []
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const raw = m[0]
    const name = m[1].toLowerCase()
    if (raw.startsWith('</')) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) {
          stack.splice(i, 1)
          break
        }
      }
    } else {
      stack.push({ name, raw })
    }
  }
  return stack
}

// Determina se o índice `i` está dentro de `<...>` ou `&...;` — cortar aqui quebraria a tag/entidade.
function isUnsafeCutPosition(s: string, i: number): boolean {
  const lt = s.lastIndexOf('<', i - 1)
  const gt = s.lastIndexOf('>', i - 1)
  if (lt > gt) return true
  const amp = s.lastIndexOf('&', i - 1)
  const semi = s.lastIndexOf(';', i - 1)
  const ws = Math.max(
    s.lastIndexOf(' ', i - 1),
    s.lastIndexOf('\n', i - 1),
    s.lastIndexOf('\t', i - 1),
  )
  if (amp > semi && amp > ws && i - amp <= 10) return true
  return false
}

function findHtmlSafeCut(s: string, budget: number): number {
  const max = Math.min(budget, s.length)
  // Preferência: quebra de parágrafo, depois linha, depois espaço — todas fora de tag/entidade.
  const candidates: number[] = []
  for (let i = max; i > Math.floor(max / 2); i--) {
    const ch = s[i - 1]
    if (ch !== ' ' && ch !== '\n' && ch !== '\t') continue
    if (isUnsafeCutPosition(s, i)) continue
    candidates.push(i)
    if (candidates.length >= 1 && ch === '\n' && s[i - 2] === '\n') return i
  }
  if (candidates.length) return candidates[0]
  // Fallback: recua até sair de qualquer tag/entidade.
  let i = max
  while (i > 0 && isUnsafeCutPosition(s, i)) i--
  return i > 0 ? i : max
}

// Chunking ciente de HTML: fecha tags abertas no fim de cada parte e reabre no início da próxima,
// preservando atributos (href, class, etc.) para links e spoilers continuarem válidos.
export function chunkHtml(text: string, limit: number): string[] {
  if (text.length <= limit) return [text]
  const out: string[] = []
  let rest = text
  let carry = ''
  while (carry.length + rest.length > limit) {
    const budget = Math.max(1, limit - carry.length)
    const cut = findHtmlSafeCut(rest, budget)
    if (cut <= 0) {
      // Nada cortável — emite o que dá e segue em frente para evitar loop.
      out.push(carry + rest.slice(0, budget))
      carry = ''
      rest = rest.slice(budget)
      continue
    }
    const body = carry + rest.slice(0, cut)
    const stack = openTagStack(body)
    const closing = stack
      .slice()
      .reverse()
      .map(t => `</${t.name}>`)
      .join('')
    const reopening = stack.map(t => t.raw).join('')
    out.push(body + closing)
    carry = reopening
    rest = rest.slice(cut).replace(/^[\s]+/, '')
  }
  if (rest.length) out.push(carry + rest)
  return out
}
