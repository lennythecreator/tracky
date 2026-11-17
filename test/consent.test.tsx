import { act, useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider, useAnalytics } from '../src/index.js'
import type { CaptureOptions } from '../src/types.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { cleanup, click, render } from './render.js'

const SESSION_KEY = 'ui-analytics-session-id'

let fetch: FetchStub

beforeEach(() => {
  vi.useFakeTimers()
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  fetch = stubFetch()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const storedSessionId = () => window.sessionStorage.getItem(SESSION_KEY)
const byId = (id: string) => document.getElementById(id)!

function Page({ capture }: { capture?: CaptureOptions }) {
  return (
    <AnalyticsProvider endpoint={ENDPOINT} options={{ capture }}>
      <button id="save" type="button">Save</button>
    </AnalyticsProvider>
  )
}

describe('storage before consent', () => {
  it('writes nothing when capture is off and no event is tracked', async () => {
    render(<Page capture={{}} />)
    click(byId('save'))
    act(() => window.history.pushState(null, '', '/next'))
    await settle()

    expect(fetch.mock).not.toHaveBeenCalled()
    expect(storedSessionId()).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
  })

  it('creates the session ID on the first tracked event, not when the client is created', async () => {
    function Startup() {
      const analytics = useAnalytics()
      useEffect(() => { analytics.track('startup') }, [analytics])
      return null
    }

    render(
      <AnalyticsProvider endpoint={ENDPOINT}>
        <Startup />
      </AnalyticsProvider>,
    )
    await settle()

    expect(storedSessionId()).toEqual(expect.any(String))
    expect(fetch.events()[0].sessionId).toBe(storedSessionId())
  })
})

describe('consent after mount', () => {
  /** Renders capture off first, then applies the stored decision it reads. */
  function Gated({ stored }: { stored: boolean }) {
    const [granted, setGranted] = useState(false)
    useEffect(() => { setGranted(stored) }, [stored])
    return (
      <AnalyticsProvider
        endpoint={ENDPOINT}
        options={{ capture: granted ? { pageViews: true, clicks: true } : {} }}
      >
        <button id="save" type="button">Save</button>
      </AnalyticsProvider>
    )
  }

  it('starts capturing once the stored decision allows it', async () => {
    const view = render(<Gated stored={false} />)
    click(byId('save'))
    await settle()

    expect(fetch.mock).not.toHaveBeenCalled()
    expect(storedSessionId()).toBeNull()

    view.rerender(<Gated stored />)
    click(byId('save'))
    await settle()

    expect(fetch.events().map((event) => event.eventType)).toEqual(['pageview', 'click'])
    expect(storedSessionId()).toEqual(expect.any(String))
  })

  it('captures nothing when no stored decision was found', async () => {
    render(<Gated stored={false} />)
    click(byId('save'))
    act(() => window.history.pushState(null, '', '/reports'))
    await settle()

    expect(fetch.mock).not.toHaveBeenCalled()
    expect(window.sessionStorage.length).toBe(0)
  })
})
