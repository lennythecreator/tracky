import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from './utils.js'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded border border-slate-400 accent-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
})
