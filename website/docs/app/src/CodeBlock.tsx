import { useMemo } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { highlight } from './highlight'

/** The kinds `docs.css` colors; punctuation and plain text render as written. */
const COLORED = new Set(['comment', 'string', 'number', 'keyword', 'literal', 'tag'])

interface CodeBlockProps {
  children?: ReactNode
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as ReactElement<{ children?: ReactNode }>).props.children)
  }
  return ''
}

function languageOf(node: ReactNode): string {
  if (!node || typeof node !== 'object' || !('props' in node)) return ''
  const className = (node as ReactElement<{ className?: string }>).props.className ?? ''
  return /language-([\w-]+)/.exec(className)?.[1]?.toLowerCase() ?? ''
}

/**
 * MDX renders a fenced block as `pre > code`. Reading the text back out of that
 * element keeps the author's fenced source as the only input, so highlighting
 * can never change what the example says.
 */
export function CodeBlock({ children }: CodeBlockProps) {
  const language = languageOf(children)
  const code = textOf(children).replace(/\n$/, '')
  const tokens = useMemo(() => highlight(code, language), [code, language])

  return (
    <pre>
      <code className={language ? `language-${language}` : undefined}>
        {tokens.map((token, index) =>
          COLORED.has(token.kind) ? (
            <span key={index} className={`docs-token-${token.kind}`}>
              {token.text}
            </span>
          ) : (
            token.text
          ),
        )}
      </code>
    </pre>
  )
}
