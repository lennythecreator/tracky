import { forwardRef } from 'react'
import type { LabelHTMLAttributes } from 'react'
import { cn } from './utils.js'

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, ...props },
  ref,
) {
  return (
    <label
      {...props}
      ref={ref}
      className={cn('font-sans text-sm font-medium leading-none text-foreground', className)}
    />
  )
})
