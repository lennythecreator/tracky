export type TokenKind = 'punct' | 'tag' | 'attr' | 'str' | 'num'

export interface Token {
  text: string
  /** Undefined for whitespace and JSX text, which stay in the default colour. */
  kind?: TokenKind
}

const TAG_OPEN = /<\/?/y
const NAME = /[A-Za-z][\w.]*/y
const ATTR = /[A-Za-z_$][\w$-]*/y
const STRING = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y
const LITERAL = /\{\s*-?\d+(?:\.\d+)?\s*\}|\{\s*(?:true|false)\s*\}/y
const EQUALS = /=/y
const CLOSE = /\/?>|>/y

function matchAt(pattern: RegExp, source: string, index: number): string | null {
  pattern.lastIndex = index
  const match = pattern.exec(source)
  return match ? match[0] : null
}

/**
 * Splits a JSX sample into coloured pieces: tag names, attribute names, quoted
 * values, literal expressions, and the punctuation between them. The samples in
 * the playground are hand-written JSX, so this walks tags rather than parsing
 * TypeScript.
 */
export function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  let inTag = false

  const push = (text: string, kind?: TokenKind) => {
    if (!text) return
    const previous = tokens[tokens.length - 1]
    if (previous && !previous.kind && !kind) {
      previous.text += text
      return
    }
    tokens.push({ text, kind })
  }

  while (index < code.length) {
    if (!inTag) {
      const open = matchAt(TAG_OPEN, code, index)
      if (open && /[A-Za-z]/.test(code[index + open.length] ?? '')) {
        push(open, 'punct')
        index += open.length
        const name = matchAt(NAME, code, index)
        if (name) {
          push(name, 'tag')
          index += name.length
        }
        inTag = true
        continue
      }
      push(code[index])
      index += 1
      continue
    }

    const literal = matchAt(LITERAL, code, index)
    if (literal) {
      push(literal, 'num')
      index += literal.length
      continue
    }

    const quoted = matchAt(STRING, code, index)
    if (quoted) {
      push(quoted, 'str')
      index += quoted.length
      continue
    }

    const close = matchAt(CLOSE, code, index)
    if (close) {
      push(close, 'punct')
      index += close.length
      inTag = false
      continue
    }

    const equals = matchAt(EQUALS, code, index)
    if (equals) {
      push(equals, 'punct')
      index += equals.length
      continue
    }

    const attribute = matchAt(ATTR, code, index)
    if (attribute) {
      push(attribute, 'attr')
      index += attribute.length
      continue
    }

    push(code[index])
    index += 1
  }

  return tokens
}
