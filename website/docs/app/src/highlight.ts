/**
 * A small tokenizer for the docs' code blocks.
 *
 * The pages carry short TSX, HTML, and shell examples. A full highlighter
 * (Shiki, Prism) would add a dependency, a grammar, and a theme for a handful
 * of blocks, so this scanner covers only what those examples use: comments,
 * strings, numbers, keywords, literals, JSX tags, and attribute names.
 *
 * It never reorders or drops text: joining every token reproduces the input.
 */

export type TokenKind = 'plain' | 'punct' | 'comment' | 'string' | 'number' | 'keyword' | 'literal' | 'tag' | 'attr'

export interface Token {
  text: string
  kind: TokenKind
}

const KEYWORDS = new Set([
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'namespace',
  'new',
  'of',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'satisfies',
  'static',
  'switch',
  'this',
  'throw',
  'try',
  'type',
  'typeof',
  'var',
  'void',
  'while',
  'yield',
])

const LITERALS = new Set(['false', 'Infinity', 'NaN', 'null', 'true', 'undefined'])

const SCRIPTS = new Set(['js', 'jsx', 'javascript', 'ts', 'tsx', 'typescript'])
const SHELLS = new Set(['bash', 'sh', 'shell', 'zsh'])

const SPACE = /\s/
const WORD_START = /[A-Za-z_$]/
const WORD = /[A-Za-z0-9_$]/
const DIGIT = /[0-9]/

interface Scanner {
  source: string
  index: number
  tokens: Token[]
}

function push(scanner: Scanner, text: string, kind: TokenKind): void {
  if (text) scanner.tokens.push({ text, kind })
}

function readWhile(scanner: Scanner, pattern: RegExp): string {
  const start = scanner.index
  while (scanner.index < scanner.source.length && pattern.test(scanner.source[scanner.index]!)) {
    scanner.index += 1
  }
  return scanner.source.slice(start, scanner.index)
}

function readString(scanner: Scanner): void {
  const quote = scanner.source[scanner.index]
  if (!quote) return
  const start = scanner.index
  scanner.index += 1
  while (scanner.index < scanner.source.length) {
    const character = scanner.source[scanner.index]
    if (character === '\\') {
      scanner.index += 2
      continue
    }
    scanner.index += 1
    if (character === quote) break
  }
  push(scanner, scanner.source.slice(start, scanner.index), 'string')
}

/** Everything between `<` and `>`: tag name, attribute names, and their values. */
function readTag(scanner: Scanner): void {
  let named = false
  while (scanner.index < scanner.source.length) {
    const character = scanner.source[scanner.index]!

    if (SPACE.test(character)) {
      push(scanner, readWhile(scanner, SPACE), 'plain')
      continue
    }
    if (character === '"' || character === "'") {
      readString(scanner)
      continue
    }
    if (character === '>') {
      push(scanner, '>', 'punct')
      scanner.index += 1
      return
    }
    if (character === '/') {
      push(scanner, '/', 'punct')
      scanner.index += 1
      continue
    }
    if (character === '{') {
      push(scanner, '{', 'punct')
      scanner.index += 1
      scanCode(scanner, true)
      if (scanner.source[scanner.index] === '}') {
        push(scanner, '}', 'punct')
        scanner.index += 1
      }
      continue
    }
    if (WORD_START.test(character)) {
      const word = readWhile(scanner, WORD)
      push(scanner, word, named ? 'attr' : 'tag')
      named = true
      continue
    }

    push(scanner, character, 'punct')
    scanner.index += 1
  }
}

function scanCode(scanner: Scanner, insideBraces: boolean): void {
  while (scanner.index < scanner.source.length) {
    const character = scanner.source[scanner.index]!
    const next = scanner.source[scanner.index + 1]

    if (SPACE.test(character)) {
      push(scanner, readWhile(scanner, SPACE), 'plain')
      continue
    }
    if (character === '/' && next === '/') {
      const start = scanner.index
      while (scanner.index < scanner.source.length && scanner.source[scanner.index] !== '\n') {
        scanner.index += 1
      }
      push(scanner, scanner.source.slice(start, scanner.index), 'comment')
      continue
    }
    if (character === '/' && next === '*') {
      const end = scanner.source.indexOf('*/', scanner.index + 2)
      const stop = end === -1 ? scanner.source.length : end + 2
      push(scanner, scanner.source.slice(scanner.index, stop), 'comment')
      scanner.index = stop
      continue
    }
    if (character === '"' || character === "'" || character === '`') {
      readString(scanner)
      continue
    }
    if (DIGIT.test(character)) {
      push(scanner, readWhile(scanner, /[0-9A-Za-z._]/), 'number')
      continue
    }
    if (character === '<' && (WORD_START.test(next ?? '') || next === '/')) {
      push(scanner, '<', 'punct')
      scanner.index += 1
      readTag(scanner)
      continue
    }
    if (WORD_START.test(character)) {
      const word = readWhile(scanner, WORD)
      push(scanner, word, KEYWORDS.has(word) ? 'keyword' : LITERALS.has(word) ? 'literal' : 'plain')
      continue
    }
    if (character === '{') {
      push(scanner, '{', 'punct')
      scanner.index += 1
      scanCode(scanner, true)
      if (scanner.source[scanner.index] === '}') {
        push(scanner, '}', 'punct')
        scanner.index += 1
      }
      continue
    }
    if (insideBraces && character === '}') return

    push(scanner, character, 'punct')
    scanner.index += 1
  }
}

function scanHtml(scanner: Scanner): void {
  while (scanner.index < scanner.source.length) {
    if (scanner.source.startsWith('<!--', scanner.index)) {
      const end = scanner.source.indexOf('-->', scanner.index + 4)
      const stop = end === -1 ? scanner.source.length : end + 3
      push(scanner, scanner.source.slice(scanner.index, stop), 'comment')
      scanner.index = stop
      continue
    }
    if (scanner.source[scanner.index] === '<') {
      push(scanner, '<', 'punct')
      scanner.index += 1
      readTag(scanner)
      continue
    }

    const start = scanner.index
    while (scanner.index < scanner.source.length && scanner.source[scanner.index] !== '<') {
      scanner.index += 1
    }
    push(scanner, scanner.source.slice(start, scanner.index), 'plain')
  }
}

function scanShell(scanner: Scanner): void {
  let commandStart = true
  while (scanner.index < scanner.source.length) {
    const character = scanner.source[scanner.index]!

    if (character === '\n') {
      push(scanner, '\n', 'plain')
      scanner.index += 1
      commandStart = true
      continue
    }
    if (SPACE.test(character)) {
      push(scanner, readWhile(scanner, SPACE), 'plain')
      continue
    }
    if (character === '#') {
      const start = scanner.index
      while (scanner.index < scanner.source.length && scanner.source[scanner.index] !== '\n') {
        scanner.index += 1
      }
      push(scanner, scanner.source.slice(start, scanner.index), 'comment')
      continue
    }
    if (character === '"' || character === "'") {
      readString(scanner)
      commandStart = false
      continue
    }

    const word = readWhile(scanner, /[^\s]/)
    push(scanner, word, commandStart ? 'keyword' : word.startsWith('-') ? 'attr' : 'plain')
    commandStart = false
  }
}

/**
 * Tokens for one block. An unknown or missing language returns the source as a
 * single plain token, so a block always renders its text.
 */
export function highlight(source: string, language?: string): Token[] {
  const name = (language ?? '').toLowerCase()
  const scanner: Scanner = { source, index: 0, tokens: [] }

  if (SCRIPTS.has(name)) scanCode(scanner, false)
  else if (name === 'html') scanHtml(scanner)
  else if (SHELLS.has(name)) scanShell(scanner)
  else return [{ text: source, kind: 'plain' }]

  return scanner.tokens
}
