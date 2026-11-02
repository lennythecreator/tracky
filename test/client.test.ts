import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAnalyticsClient } from '../src/client.js'
import { ENDPOINT, settle, stubFetch } from './helpers.js'

beforeEach(() => {
  vi.useFakeTimers()
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('event envelope', () => {
  it('sends eventType, an ISO UTC timestamp, path plus query, merged context, and a session ID', async () => {
    const fetch = stubFetch()
    window.history.replaceState(null, '', '/reports?tab=exports#summary')
    const client = createAnalyticsClient(ENDPOINT, { context: { app: 'dashboard', plan: 'free' } })

    client.track('report_exported', { format: 'csv', plan: 'team' })
    await settle()

    const [event] = fetch.events()
    expect(event.eventType).toBe('report_exported')
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(event.route).toBe('/reports?tab=exports')
    expect(event.context).toEqual({ app: 'dashboard', plan: 'team', format: 'csv' })
    expect(event.sessionId).toEqual(expect.any(String))
    expect(event.component).toBeUndefined()
    expect(fetch.mock).toHaveBeenCalledWith(ENDPOINT, expect.objectContaining({ method: 'POST', keepalive: true }))
  })

  it('reuses the tab-scoped session ID across events and clients', async () => {
    const fetch = stubFetch()
    const first = createAnalyticsClient(ENDPOINT)
    const second = createAnalyticsClient(ENDPOINT)

    first.track('a')
    first.track('b')
    second.track('c')
    await settle()

    const ids = new Set(fetch.events().map((event) => event.sessionId))
    expect(ids.size).toBe(1)
    expect(window.sessionStorage.getItem('ui-analytics-session-id')).toBe([...ids][0])
  })

  it('ignores blank event names', async () => {
    const fetch = stubFetch()
    const client = createAnalyticsClient(ENDPOINT)

    client.track('  ')
    client.trackComponentEvent('', 'activate')
    client.trackComponentEvent('button', ' ')
    await settle()

    expect(fetch.mock).not.toHaveBeenCalled()
  })

  it('puts component actions in a top-level component object, not in context', async () => {
    const fetch = stubFetch()
    const client = createAnalyticsClient(ENDPOINT)

    client.trackComponentEvent('save_button', 'activate', { location: 'toolbar' })
    await settle()

    const [event] = fetch.events()
    expect(event.eventType).toBe('component_interaction')
    expect(event.component).toEqual({ name: 'save_button', action: 'activate' })
    expect(event.context).toEqual({ location: 'toolbar' })
  })
})

describe('delivery', () => {
  it('sends a batch as soon as it reaches batchSize', async () => {
    const fetch = stubFetch()
    const client = createAnalyticsClient(ENDPOINT, { batchSize: 3 })

    client.track('a')
    client.track('b')
    expect(fetch.mock).not.toHaveBeenCalled()

    client.track('c')
    await vi.advanceTimersByTimeAsync(0)

    expect(fetch.batches().map((batch) => batch.map((event) => event.eventType))).toEqual([['a', 'b', 'c']])
  })

  it('sends a partial batch after flushIntervalMs', async () => {
    const fetch = stubFetch()
    const client = createAnalyticsClient(ENDPOINT, { flushIntervalMs: 1_000 })

    client.track('a')
    await vi.advanceTimersByTimeAsync(999)
    expect(fetch.mock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(fetch.events().map((event) => event.eventType)).toEqual(['a'])
  })

  it('retries a failed batch with backoff, then succeeds', async () => {
    const fetch = stubFetch((call) => new Response(null, { status: call < 3 ? 503 : 204 }))
    const onDeliveryError = vi.fn()
    const client = createAnalyticsClient(ENDPOINT, { onDeliveryError })

    client.track('a')
    void client.flush()
    await settle()

    expect(fetch.mock).toHaveBeenCalledTimes(3)
    expect(onDeliveryError).not.toHaveBeenCalled()
  })

  it('stops after maxRetries and reports the error once', async () => {
    const fetch = stubFetch(() => new Response(null, { status: 503 }))
    const onDeliveryError = vi.fn()
    const client = createAnalyticsClient(ENDPOINT, { maxRetries: 2, onDeliveryError })

    client.track('a')
    void client.flush()
    await settle()

    expect(fetch.mock).toHaveBeenCalledTimes(3)
    expect(onDeliveryError).toHaveBeenCalledTimes(1)
    expect(onDeliveryError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('reports network errors through onDeliveryError instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    const onDeliveryError = vi.fn()
    const client = createAnalyticsClient(ENDPOINT, { maxRetries: 0, onDeliveryError })

    client.track('a')
    await expect(client.flush()).resolves.toBeUndefined()
    expect(onDeliveryError).toHaveBeenCalledWith(expect.any(TypeError))
  })

  it('flushes queued events on shutdown and ignores events afterwards', async () => {
    const fetch = stubFetch()
    const client = createAnalyticsClient(ENDPOINT)

    client.track('a')
    await client.shutdown()
    client.track('b')
    await settle()

    expect(fetch.events().map((event) => event.eventType)).toEqual(['a'])
  })
})
