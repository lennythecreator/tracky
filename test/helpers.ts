import { vi } from 'vitest'
import type { AnalyticsEvent } from '../src/types.js'

export const ENDPOINT = 'https://collector.example.com/events'

export interface FetchStub {
  /** Every event the stub received, across all batches, in order. */
  events: () => AnalyticsEvent[]
  /** One entry per request, each holding that request's batch. */
  batches: () => AnalyticsEvent[][]
  /** Raw request bodies, for checks that must not depend on parsing. */
  bodies: () => string[]
  mock: ReturnType<typeof vi.fn>
}

/**
 * Replace `fetch` with a stub that records each batch. `respond` decides the
 * outcome of each call; by default every request succeeds.
 */
export function stubFetch(respond: (call: number) => Response | Promise<Response> = () => new Response(null, { status: 204 })): FetchStub {
  const bodies: string[] = []
  const mock = vi.fn(async (_url: string, init?: RequestInit) => {
    bodies.push(String(init?.body))
    return respond(bodies.length)
  })
  vi.stubGlobal('fetch', mock)

  const batches = () => bodies.map((body) => (JSON.parse(body) as { events: AnalyticsEvent[] }).events)
  return { mock, bodies: () => [...bodies], batches, events: () => batches().flat() }
}

/** Let pending timers and the promise chains they start run to completion. */
export async function settle(ms = 60_000): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
}
