import type { ReactNode } from 'react'
import { Snippet } from './Snippet'

interface PrimitiveCardProps {
  id: string
  title: string
  description: string
  /** The documented action this component sends, or `null` when it sends none. */
  action: string | null
  snippet: string
  wide?: boolean
  children: ReactNode
}

export function PrimitiveCard({
  id,
  title,
  description,
  action,
  snippet,
  wide = false,
  children,
}: PrimitiveCardProps) {
  return (
    <article
      id={id}
      className={`surface scroll-mt-24 p-5 ${wide ? 'xl:col-span-2' : ''}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-[0.95rem] font-bold tracking-tight text-[var(--pg-ink)]">
            {title}
          </h2>
          <p className="mt-1 max-w-[36ch] text-xs leading-relaxed text-[var(--pg-muted)]">
            {description}
          </p>
        </div>

        {action ? (
          <span className="event-badge shrink-0 self-start">
            <span className="live-dot" aria-hidden="true" />
            {action}
          </span>
        ) : (
          <span className="event-badge event-badge-quiet shrink-0 self-start">no event</span>
        )}
      </div>

      {children}

      <Snippet code={snippet} />
    </article>
  )
}

interface StateChipsProps {
  /** App-side state the developer owns — never collected by Tracky. */
  app: Array<[string, string | number]>
  /** What the SDK last sent for this component, if anything. */
  tracky?: string
}

export function StateChips({ app, tracky }: StateChipsProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--pg-soft)]">
          your app
        </span>
        {app.map(([label, value]) => (
          <span key={label} className="state-chip">
            <span>{label}</span>
            <span>{value}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--pg-soft)]">
          tracky sends
        </span>
        <span className="state-chip whitespace-nowrap">
          <span>{tracky ?? 'nothing'}</span>
        </span>
      </div>
    </div>
  )
}
