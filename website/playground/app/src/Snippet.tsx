import { useEffect, useRef, useState } from 'react'

interface SnippetProps {
  code: string
}

/** Code sample with a copy control, so the examples are usable rather than decorative. */
export function Snippet({ code }: SnippetProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pre = useRef<HTMLPreElement>(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      // When the browser refuses clipboard access, select the sample instead so
      // it can still be copied with the keyboard.
      window.getSelection()?.selectAllChildren(pre.current as HTMLPreElement)
    }
  }

  return (
    <div className="code-shell mt-4">
      <div className="code-bar">
        <span>tsx</span>
        <button type="button" className="code-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre ref={pre} className="overflow-x-auto px-3.5 py-3 text-[11px] leading-[1.7]">
        <code className="whitespace-pre-wrap break-words">{code}</code>
      </pre>
    </div>
  )
}
