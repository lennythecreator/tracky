import type { ReactNode } from 'react'

export interface KbdProps {
  children?: ReactNode
}

/**
 * One key or chord, rendered as the element a screen reader announces as a key.
 * Authors write `<Kbd>Cmd</Kbd> + <Kbd>K</Kbd>` for a two-key shortcut.
 */
export function Kbd({ children }: KbdProps) {
  return (
    <kbd className="mx-0.5 inline-flex min-w-6 items-center justify-center rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] font-semibold text-foreground shadow-[0_1px_0_var(--tracky-border)]">
      {children}
    </kbd>
  )
}
