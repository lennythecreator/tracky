import { CliError } from './errors.js'

/**
 * Position of the next character that is neither whitespace nor a comment.
 * Used to detect trailing commas without mistaking a comma inside a string.
 */
function skipInsignificant(text: string, index: number): number {
  let i = index

  while (i < text.length) {
    const char = text[i]

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\uFEFF') {
      i += 1
      continue
    }

    if (char === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1
      continue
    }

    if (char === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1
      i = Math.min(i + 2, text.length)
      continue
    }

    break
  }

  return i
}

/**
 * Parses JSON with comments and trailing commas, which is what `tsconfig.json`
 * and other TypeScript-adjacent files are allowed to contain.
 */
export function parseJsonc(text: string, source: string): unknown {
  let output = ''
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (char === '"') {
      const start = i
      i += 1
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2
          continue
        }
        if (text[i] === '"') {
          i += 1
          break
        }
        i += 1
      }
      output += text.slice(start, i)
      continue
    }

    if (char === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1
      continue
    }

    if (char === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1
      i = Math.min(i + 2, text.length)
      continue
    }

    if (char === ',') {
      const next = skipInsignificant(text, i + 1)
      if (text[next] === '}' || text[next] === ']') {
        i += 1
        continue
      }
    }

    output += char
    i += 1
  }

  try {
    return JSON.parse(output.replace(/^\uFEFF/, ''))
  } catch (error) {
    throw new CliError(
      `${source} is not valid JSON.`,
      error instanceof Error ? error.message : undefined,
    )
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
