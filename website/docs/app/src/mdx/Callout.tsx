import type { ReactNode } from 'react'

export interface CalloutProps {
  variant?: 'note' | 'warning'
  /** A short label above the body; "Note" and "Warning" are the defaults. */
  title?: string
  children?: ReactNode
}

const TONE = {
  note: {
    box: 'border-border bg-muted',
    label: 'text-muted-foreground',
  },
  warning: {
    box: 'border-destructive/40 bg-destructive/5',
    label: 'text-destructive',
  },
}

/**
 * A short aside that belongs beside the page, not in it. The variant changes the
 * border and label only; both keep body text at the page's contrast.
 */
export function Callout({ variant = 'note', title, children }: CalloutProps) {
  const tone = TONE[variant]
  const label = title ?? (variant === 'warning' ? 'Warning' : 'Note')

  return (
    <aside className={`my-5 rounded-md border px-4 py-3 ${tone.box}`}>
      <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.12em] ${tone.label}`}>{label}</p>
      <div className="text-[0.9375rem] leading-relaxed">{children}</div>
    </aside>
  )
}
