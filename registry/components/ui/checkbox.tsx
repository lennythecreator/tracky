import { forwardRef } from 'react'
import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { useAnalyticsOptional } from 'tracky'
import { cn } from './utils.js'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /**
   * Stable name attached to this component's analytics event.
   * Takes precedence over `data-analytics-name`, which it is rendered as.
   */
  analyticsName?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, analyticsName, onChange, ...props },
  ref,
) {
  const analytics = useAnalyticsOptional()

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event)
    const name = event.currentTarget.dataset.analyticsName
    analytics?.trackComponentEvent('checkbox', 'toggle', name ? { name } : undefined)
  }

  return (
    <input
      {...props}
      {...(analyticsName ? { 'data-analytics-name': analyticsName } : undefined)}
      ref={ref}
      type="checkbox"
      data-tracky-component="checkbox"
      onChange={handleChange}
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded-sm border border-border accent-primary aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
})
