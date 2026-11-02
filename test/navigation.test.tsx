import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider } from '../src/index.js'
import type { AnalyticsOptions } from '../src/types.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { cleanup, click, render } from './render.js'

let fetch: FetchStub
const { pushState: originalPushState, replaceState: originalReplaceState } = window.history

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

function App({ options }: { options?: AnalyticsOptions }) {
  return (
    <AnalyticsProvider endpoint={ENDPOINT} options={options}>
      <a id="anchor" href="#details">Details</a>
    </AnalyticsProvider>
  )
}

const pageViews = () => fetch.events().filter((event) => event.eventType === 'pageview').map((event) => event.route)

async function navigate(url: string) {
  act(() => window.history.pushState(null, '', url))
  await vi.advanceTimersByTimeAsync(0)
}

/** Move the location without the History API wrappers, then fire popstate as the browser does on back/forward. */
async function traverse(url: string) {
  act(() => {
    originalReplaceState.call(window.history, null, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await vi.advanceTimersByTimeAsync(0)
}

describe('navigation', () => {
  it('sends one page view each for initial load, back, and forward', async () => {
    render(<App options={{ capture: { pageViews: true } }} />)
    await navigate('/reports')
    await traverse('/')
    await traverse('/reports')
    await settle()

    expect(pageViews()).toEqual(['/', '/reports', '/', '/reports'])
  })

  it('treats a link click without a route change as a click, not a page view', async () => {
    render(<App options={{ capture: { pageViews: true, clicks: true } }} />)
    click(document.getElementById('anchor')!)
    await settle()

    expect(fetch.events().map((event) => event.eventType)).toEqual(['pageview', 'click'])
  })
})

describe('resolveRoute', () => {
  const hashRoute = (location: Location) => location.hash.startsWith('#/') ? location.hash.slice(1) : '/'

  it('lets a hash-based router report hash changes as page views', async () => {
    render(<App options={{ capture: { pageViews: true }, resolveRoute: hashRoute }} />)
    await navigate('/#/settings')
    await navigate('/#/settings/billing')
    await settle()

    expect(pageViews()).toEqual(['/', '/settings', '/settings/billing'])
  })

  it('sets the route field on every event from the resolver', async () => {
    render(<App options={{ capture: { clicks: true }, resolveRoute: hashRoute }} />)
    await navigate('/?tab=1#/settings')
    click(document.getElementById('anchor')!)
    await settle()

    expect(fetch.events().map((event) => event.route)).toEqual(['/settings'])
  })

  it('ignores a location when the resolver returns null', async () => {
    const skipLogin = (location: Location) => location.pathname === '/login' ? null : location.pathname
    render(<App options={{ capture: { pageViews: true }, resolveRoute: skipLogin }} />)
    await navigate('/login')
    await navigate('/dashboard')
    await settle()

    expect(pageViews()).toEqual(['/', '/dashboard'])
  })

  it('falls back to path plus query when the resolver throws', async () => {
    const broken = () => { throw new Error('router not ready') }
    render(<App options={{ capture: { pageViews: true }, resolveRoute: broken }} />)
    await navigate('/reports?tab=exports')
    await settle()

    expect(pageViews()).toEqual(['/', '/reports?tab=exports'])
  })
})

describe('shared History API observer', () => {
  it('wraps the History API once for several providers and restores it when the last unmounts', async () => {
    const first = render(<App options={{ capture: { pageViews: true } }} />)
    const wrapped = window.history.pushState
    const second = render(<App options={{ capture: { pageViews: true } }} />)
    expect(window.history.pushState).toBe(wrapped)

    first.unmount()
    await navigate('/still-tracked')
    second.unmount()
    expect(window.history.pushState).toBe(originalPushState)
    expect(window.history.replaceState).toBe(originalReplaceState)
    await settle()

    // Two initial views (one per provider), then one from the remaining provider.
    expect(pageViews()).toEqual(['/', '/', '/still-tracked'])
  })
})
