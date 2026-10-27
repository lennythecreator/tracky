import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from './utils.js'

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, role = 'switch', ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      role={role}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-muted transition-colors aria-[invalid=true]:border aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-switch-thumb after:shadow-sm after:transition-transform checked:after:translate-x-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
})
