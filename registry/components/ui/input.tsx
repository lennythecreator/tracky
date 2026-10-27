import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from './utils.js'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
})
