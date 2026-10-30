import { act, StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider } from '../src/index.js'
import type { AnalyticsOptions } from '../src/types.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { cleanup, click, render } from './render.js'

let fetch: FetchStub

beforeEach(() => {
  vi.useFakeTimers()
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  document.title = 'Home'
  fetch = stubFetch()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function App({ options }: { options?: AnalyticsOptions }) {
  return (
    <AnalyticsProvider endpoint={ENDPOINT} options={options}>
      <button id="save" type="button">Save</button>
    </AnalyticsProvider>
  )
}

const pageViews = () => fetch.events().filter((event) => event.eventType === 'pageview')

describe('options after mount', () => {
  it('starts page-view and interaction capture when consent arrives later', async () => {
    const view = render(<App />)
    click(document.getElementById('save')!)
    await settle()
    expect(fetch.mock).not.toHaveBeenCalled()

    view.rerender(<App options={{ capturePageViews: true, captureInteractions: true }} />)
    click(document.getElementById('save')!)
    await settle()

    expect(fetch.events().map((event) => event.eventType)).toEqual(['pageview', 'click'])
  })

  it('stops capture when the option is turned off', async () => {
    const view = render(<App options={{ capturePageViews: true, captureInteractions: true }} />)
    view.rerender(<App options={{}} />)
    click(document.getElementById('save')!)
    act(() => window.history.pushState(null, '', '/next'))
    await settle()

    expect(fetch.events().map((event) => event.eventType)).toEqual(['pageview'])
  })

  it('uses the latest context and onDeliveryError without recreating the client', async () => {
    fetch = stubFetch(() => new Response(null, { status: 400 }))
    const first = vi.fn()
    const second = vi.fn()
    const options = (release: string, onDeliveryError: () => void): AnalyticsOptions => ({
      capturePageViews: true,
      captureInteractions: true,
      context: { release },
      onDeliveryError,
    })
    const view = render(<App options={options('1', first)} />)
    view.rerender(<App options={options('2', second)} />)
    click(document.getElementById('save')!)
    await settle()

    // Each event keeps the context it was tracked with; the page view is not
    // repeated, and the failed batch reports to the current callback.
    expect(fetch.events().map((event) => [event.eventType, event.context.release])).toEqual([
      ['pageview', '1'],
      ['click', '2'],
    ])
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})

describe('page views', () => {
  it('reads the title after the router renders the new page', async () => {
    render(<App options={{ capturePageViews: true }} />)
    act(() => {
      window.history.pushState(null, '', '/reports')
      document.title = 'Reports'
    })
    await settle()

    expect(pageViews().map((event) => [event.route, event.context.title])).toEqual([
      ['/', 'Home'],
      ['/reports', 'Reports'],
    ])
  })

  it('ignores hash-only changes', async () => {
    render(<App options={{ capturePageViews: true }} />)
    act(() => window.history.pushState(null, '', '/#pricing'))
    await settle()
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    await settle()

    expect(pageViews()).toHaveLength(1)
  })

  it('counts a redirect in the same task once, at its destination', async () => {
    render(<App options={{ capturePageViews: true }} />)
    act(() => {
      window.history.pushState(null, '', '/login')
      window.history.replaceState(null, '', '/dashboard')
    })
    await settle()

    expect(pageViews().map((event) => event.route)).toEqual(['/', '/dashboard'])
  })

  it('sends one initial page view under Strict Mode', async () => {
    render(<StrictMode><App options={{ capturePageViews: true }} /></StrictMode>)
    await settle()

    expect(pageViews()).toHaveLength(1)
  })

  it('leaves a later History API wrapper in place on unmount', async () => {
    const original = window.history.pushState
    const view = render(<App options={{ capturePageViews: true }} />)
    const routerCalls: string[] = []
    const ours = window.history.pushState
    const router: History['pushState'] = function (this: History, ...args) {
      routerCalls.push(String(args[2]))
      ours.apply(this, args)
    }
    window.history.pushState = router

    view.unmount()
    expect(window.history.pushState).toBe(router)

    act(() => window.history.pushState(null, '', '/after-unmount'))
    await settle()
    expect(routerCalls).toEqual(['/after-unmount'])
    expect(window.location.pathname).toBe('/after-unmount')
    expect(pageViews().map((event) => event.route)).toEqual(['/'])

    window.history.pushState = original
  })
})
