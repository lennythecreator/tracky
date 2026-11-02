import type { AnalyticsClient } from '../types.js'
import { CLICKABLE, isIgnored, targetMetadata } from './dom.js'

/** Clicks on one target within this window count toward a frustration click. */
export const FRUSTRATION_WINDOW_MS = 1_000
export const FRUSTRATION_CLICKS = 3

interface Burst {
  times: number[]
  reported: boolean
}

/**
 * Send one `frustration_click` when the same target is clicked 3 or more times
 * within 1 second. The target is the live element, or its
 * `data-analytics-name` so named elements group across instances. Independent
 * of `capture.clicks`: it listens for clicks itself.
 */
export function captureFrustrationClicks(client: AnalyticsClient): () => void {
  const byElement = new WeakMap<Element, Burst>()
  const byName = new Map<string, Burst>()

  const onClick = (event: MouseEvent) => {
    // Keyboard activation sends clicks with `detail` 0; only pointer clicks count.
    if (event.detail === 0) return
    const target = event.target
    if (!(target instanceof Element) || isIgnored(target)) return

    const element = target.closest(CLICKABLE) ?? target
    const name = element instanceof HTMLElement ? element.dataset.analyticsName : undefined
    const now = performance.now()

    let burst = name ? byName.get(name) : byElement.get(element)
    const lastClick = burst?.times[burst.times.length - 1]
    if (!burst || lastClick === undefined || now - lastClick > FRUSTRATION_WINDOW_MS) {
      burst = { times: [], reported: false }
      if (name) byName.set(name, burst)
      else byElement.set(element, burst)
    }

    burst.times.push(now)
    burst.times = burst.times.filter((time) => now - time <= FRUSTRATION_WINDOW_MS)
    if (burst.times.length >= FRUSTRATION_CLICKS && !burst.reported) {
      burst.reported = true
      client.track('frustration_click', targetMetadata(element))
    }

    // Named bursts live in a Map; drop the ones that can no longer grow.
    for (const [key, entry] of byName) {
      const last = entry.times[entry.times.length - 1]
      if (last !== undefined && now - last > FRUSTRATION_WINDOW_MS) byName.delete(key)
    }
  }

  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
