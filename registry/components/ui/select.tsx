import { forwardRef } from 'react'
import type { ChangeEvent, SelectHTMLAttributes } from 'react'
import { useAnalyticsOptional } from 'tracky'
import { cn } from './utils.js'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /**
   * Stable name attached to this component's analytics event.
   * Takes precedence over `data-analytics-name`, which it is rendered as.
   */
  analyticsName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, analyticsName, onChange, ...props },
  ref,
) {
  const analytics = useAnalyticsOptional()

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event)
    const name = event.currentTarget.dataset.analyticsName
    analytics?.trackComponentEvent('select', 'change', name ? { name } : undefined)
  }

  return (
    <select
      {...props}
      {...(analyticsName ? { 'data-analytics-name': analyticsName } : undefined)}
      ref={ref}
      data-tracky-component="select"
      onChange={handleChange}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
})
