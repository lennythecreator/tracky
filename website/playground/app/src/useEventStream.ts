import { useEffect, useState } from 'react'
import type { AnalyticsEvent } from 'tracky'
import { subscribeToPreview } from './preview'

/** Newest-first list of events the SDK has delivered to the preview transport. */
export function usePreviewEvents(limit = 8): AnalyticsEvent[] {
  const [events, setEvents] = useState<AnalyticsEvent[]>([])

  useEffect(
    () =>
      subscribeToPreview((batch) => {
        setEvents((current) => [...batch].reverse().concat(current).slice(0, limit))
      }),
    [limit],
  )

  return events
}

/** The most recent event a given primitive sent, for the per-card readout. */
export function useLastEvent(component: string): AnalyticsEvent | undefined {
  return usePreviewEvents(20).find((event) => event.component?.name === component)
}
