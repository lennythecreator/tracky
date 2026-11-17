import type { ReactNode } from 'react'

export interface PageHeaderProps {
  /** Heading text; the shell owns the page's `<h1>`, so a section uses this. */
  title: string
  description?: string
  level?: 2 | 3
  /** Short labels, such as a status pill or a "Since 0.2" note. */
  meta?: ReactNode
  children?: ReactNode
}

/**
 * A section header for content that needs more than a heading: a description
 * directly under it and a row of labels beside it. Headings stay `##` or `###`,
 * so they land in the on-this-page list like any other heading.
 */
export function PageHeader({ title, description, level = 2, meta, children }: PageHeaderProps) {
  const Tag = level === 3 ? 'h3' : 'h2'

  return (
    <header className="my-6">
      <div className="flex flex-wrap items-center gap-2">
        <Tag className="mb-0">{title}</Tag>
        {meta ? <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground">{meta}</div> : null}
      </div>
      {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
      {children}
    </header>
  )
}
