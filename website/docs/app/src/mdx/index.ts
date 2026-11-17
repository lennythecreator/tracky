import type { ComponentType } from 'react'
import { CodeTabs } from '../CodeTabs'
import { Callout } from './Callout'
import { Kbd } from './Kbd'
import { PageHeader } from './PageHeader'
import { PropsTable } from './PropsTable'
import { Steps } from './Steps'

/**
 * The MDX components a page may use. MDX passes its own props, so the map is
 * wider than any one component's signature; each entry is still typed at its
 * definition, which is what the page author sees.
 */
export const mdxComponents: Record<string, ComponentType<any>> = {
  Callout,
  CodeTabs,
  Kbd,
  PageHeader,
  PropsTable,
  Steps,
}
