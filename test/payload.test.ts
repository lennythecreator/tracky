import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createAnalyticsClient } from '../src/client.js'
import { ENDPOINT, settle, stubFetch } from './helpers.js'

type ExportSummary = { rows: number; columns: string[] }

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('sends a payload as a top-level field and leaves context flat', async () => {
  const fetch = stubFetch()
  const client = createAnalyticsClient(ENDPOINT, { context: { app: 'dashboard' } })

  client.track<ExportSummary>('report_exported', { format: 'csv' }, { rows: 120, columns: ['date', 'total'] })
  await settle()

  const [event] = fetch.events()
  expect(event.payload).toEqual({ rows: 120, columns: ['date', 'total'] })
  expect(event.context).toEqual({ app: 'dashboard', format: 'csv' })
})

it('omits payload when none is passed, including on component events', async () => {
  const fetch = stubFetch()
  const client = createAnalyticsClient(ENDPOINT)

  client.track('a')
  client.trackComponentEvent('button', 'activate')
  await settle()

  expect(fetch.events().map((event) => 'payload' in event)).toEqual([false, false])
})

it('rejects payloads that are not JSON-safe at compile time', () => {
  const client = createAnalyticsClient(ENDPOINT)
  // @ts-expect-error functions do not survive JSON serialization
  client.track('a', {}, { onClick: () => {} })
  // @ts-expect-error the payload must match the named type
  client.track<ExportSummary>('a', {}, { rows: '120', columns: [] })
})
