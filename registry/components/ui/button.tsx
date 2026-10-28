import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, MouseEvent } from 'react'
import { useAnalyticsOptional } from 'tracky'
import { cn } from './utils.js'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /**
   * Stable name attached to this component's analytics event.
   * Takes precedence over `data-analytics-name`, which it is rendered as.
   */
  analyticsName?: string
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
  outline: 'border border-border bg-background text-foreground hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-10 px-4 text-sm',
  lg: 'min-h-11 px-5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', analyticsName, onClick, ...props },
  ref,
) {
  const analytics = useAnalyticsOptional()

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    const name = event.currentTarget.dataset.analyticsName
    analytics?.trackComponentEvent('button', 'activate', name ? { name } : undefined)
  }

  return (
    <button
      {...props}
      {...(analyticsName ? { 'data-analytics-name': analyticsName } : undefined)}
      ref={ref}
      type={type}
      data-tracky-component="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    />
  )
})
