import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { highlight } from './highlight'

/** The kinds `docs.css` colors; punctuation and plain text render as written. */
const COLORED = new Set(['comment', 'string', 'number', 'keyword', 'literal', 'tag'])

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

/** The highlighted block itself, without the frame or the toolbar. */
export function CodeText({ code, language }: { code: string; language: string }) {
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

type CopyState = 'idle' | 'copied' | 'failed'

const ANNOUNCEMENT: Record<CopyState, string> = {
  idle: '',
  copied: 'Code copied to the clipboard.',
  failed: 'Copying failed; select the code and copy it manually.',
}

/**
 * Copies the block's source exactly. The clipboard is touched only in the click
 * handler, never on mount, and both outcomes are announced in a live region
 * because the button label alone is not reliably read after a click.
 */
export function CopyButton({ code }: { code: string }) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    window.clearTimeout(timer.current)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('the clipboard API is unavailable')
      await navigator.clipboard.writeText(code)
      setState('copied')
    } catch {
      setState('failed')
    }
    timer.current = window.setTimeout(() => setState('idle'), 4000)
  }

  return (
    <>
      <button type="button" className="docs-code-copy" onClick={copy}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {ANNOUNCEMENT[state]}
      </span>
    </>
  )
}

/** A framed block with the language label and the copy button. */
export function CodeSurface({ code, language }: { code: string; language: string }) {
  return (
    <div className="docs-code my-5">
      <div className="docs-code-bar">
        <span className="docs-code-label">{language || 'text'}</span>
        <CopyButton code={code} />
      </div>
      <CodeText code={code} language={language} />
    </div>
  )
}

/**
 * MDX renders a fenced block as `pre > code`. Reading the text back out of that
 * element keeps the author's fenced source as the only input, so highlighting
 * and copying can never change what the example says.
 */
export function CodeBlock({ children }: { children?: ReactNode }) {
  const language = languageOf(children)
  const code = textOf(children).replace(/\n$/, '')

  return <CodeSurface code={code} language={language} />
}
