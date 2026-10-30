import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAnalyticsClient } from '../src/client.js'
import { AnalyticsProvider } from '../src/index.js'
import { ENDPOINT, settle, stubFetch } from './helpers.js'
import { cleanup, render } from './render.js'

beforeEach(() => {
  vi.useFakeTimers()
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  // Remove the per-test override so the jsdom getter applies again.
  delete (document as { visibilityState?: unknown }).visibilityState
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** A fetch stub whose requests stay open until `release()` is called. */
function holdRequests() {
  const waiting: Array<() => void> = []
  const fetch = stubFetch(() => new Promise<Response>((resolve) => {
    waiting.push(() => resolve(new Response(null, { status: 204 })))
  }))
  const release = async () => {
    while (waiting.length > 0) {
      for (const done of waiting.splice(0)) done()
      await vi.advanceTimersByTimeAsync(0)
    }
  }
  return { fetch, release }
}

describe('shutdown', () => {
  it('delivers events tracked while a batch is in flight', async () => {
    const { fetch, release } = holdRequests()
    const client = createAnalyticsClient(ENDPOINT)

    client.track('a')
    void client.flush()
    client.track('b')
    const done = client.shutdown()
    await release()
    await done

    expect(fetch.events().map((event) => event.eventType)).toEqual(['a', 'b'])
  })

  it('waits for in-flight requests before resolving', async () => {
    const { release } = holdRequests()
    const client = createAnalyticsClient(ENDPOINT)
    let resolved = false

    client.track('a')
    void client.shutdown().then(() => { resolved = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(resolved).toBe(false)

    await release()
    expect(resolved).toBe(true)
  })
})

describe('retries', () => {
  it('does not retry a request the endpoint rejected', async () => {
    const fetch = stubFetch(() => new Response(null, { status: 400 }))
    const onDeliveryError = vi.fn()
    const client = createAnalyticsClient(ENDPOINT, { onDeliveryError })

    client.track('a')
    void client.flush()
    await settle()

    expect(fetch.mock).toHaveBeenCalledTimes(1)
    expect(onDeliveryError).toHaveBeenCalledTimes(1)
  })

  it.each([408, 429, 500])('retries a %i response', async (status) => {
    const fetch = stubFetch((call) => new Response(null, { status: call === 1 ? status : 204 }))
    const client = createAnalyticsClient(ENDPOINT)

    client.track('a')
    void client.flush()
    await settle()

    expect(fetch.mock).toHaveBeenCalledTimes(2)
  })
})

describe('bounded delivery', () => {
  it('sends at most batchSize events per request as the queue drains', async () => {
    const { fetch, release } = holdRequests()
    const client = createAnalyticsClient(ENDPOINT, { batchSize: 10 })

    // Four batches fill the in-flight limit; the other 20 events wait.
    for (let i = 0; i < 60; i += 1) client.track(`e${i}`)
    expect(fetch.mock).toHaveBeenCalledTimes(4)

    await release()
    expect(fetch.batches().map((batch) => batch.length)).toEqual([10, 10, 10, 10, 10, 10])
    expect(fetch.events().map((event) => event.eventType)).toEqual(Array.from({ length: 60 }, (_, i) => `e${i}`))
  })

  it('caps waiting events while the endpoint is unreachable, keeping the newest', async () => {
    const { fetch, release } = holdRequests()
    const client = createAnalyticsClient(ENDPOINT, { batchSize: 10 })

    for (let i = 0; i < 5_000; i += 1) client.track(`e${i}`)
    // Four batches of ten are in flight; the queue keeps the newest 1,000.
    expect(fetch.mock).toHaveBeenCalledTimes(4)

    await release()
    const names = fetch.events().map((event) => event.eventType)
    expect(names).toHaveLength(40 + 1_000)
    expect(names.slice(0, 40)).toEqual(Array.from({ length: 40 }, (_, i) => `e${i}`))
    expect(names.at(-1)).toBe('e4999')
    expect(names).not.toContain('e3999')
  })
})

describe('session ID outside a secure context', () => {
  it('falls back to getRandomValues when randomUUID is unavailable', async () => {
    const fetch = stubFetch()
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      const client = createAnalyticsClient(ENDPOINT)
      expect(() => client.track('a')).not.toThrow()
      await settle()
      expect(fetch.events()[0].sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    } finally {
      delete (crypto as { randomUUID?: unknown }).randomUUID
    }
  })
})

describe('page exit', () => {
  it.each([
    ['pagehide', () => window.dispatchEvent(new Event('pagehide'))],
    ['visibilitychange to hidden', () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }],
  ])('sends buffered events on %s', async (_name, leave) => {
    const fetch = stubFetch()
    render(<AnalyticsProvider endpoint={ENDPOINT} options={{ capturePageViews: true }}>{null}</AnalyticsProvider>)

    act(leave)
    await vi.advanceTimersByTimeAsync(0)

    expect(fetch.events().map((event) => event.eventType)).toEqual(['pageview'])
  })
})
