import type { ReactNode } from 'react'

export interface StepsProps {
  children?: ReactNode
}

/**
 * An ordered procedure. Wrapping the list keeps the numbering and the rhythm in
 * one place, so a page does not restyle an `<ol>` to say "do this in order".
 */
export function Steps({ children }: StepsProps) {
  return <ol className="my-5 list-decimal space-y-2 pl-5 marker:font-bold marker:text-primary">{children}</ol>
}
