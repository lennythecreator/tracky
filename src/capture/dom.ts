import type { AnalyticsContext } from '../types.js'

/** True when the element sits inside a `data-analytics="ignore"` subtree. */
export function isIgnored(element: Element): boolean {
  return element.closest('[data-analytics="ignore"]') !== null
}

/** Controls whose activation page-wide capture reports as a click. */
export const CLICKABLE = 'button,a,[role="button"],[data-analytics-name]'

/**
 * Safe metadata for an element: tag, ID, explicit analytics name, and a
 * bounded class name. Never text, values, or attributes beyond these.
 */
export function targetMetadata(target: Element): AnalyticsContext {
  const el = target.closest<HTMLElement>('[data-analytics-name],button,a,[role="button"],input,select,textarea')
    ?? target as HTMLElement
  const safe: AnalyticsContext = {
    tag: el.tagName.toLowerCase(),
  }
  if (el.id) safe.id = el.id
  if (el.dataset.analyticsName) safe.name = el.dataset.analyticsName
  if (typeof el.className === 'string' && el.className) safe.className = el.className.slice(0, 120)
  return safe
}
