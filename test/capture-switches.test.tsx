import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider } from '../src/index.js'
import type { AnalyticsOptions, CaptureOptions } from '../src/types.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { change, cleanup, click, render } from './render.js'

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
  vi.restoreAllMocks()
})

function Page({ options }: { options?: AnalyticsOptions }) {
  return (
    <AnalyticsProvider endpoint={ENDPOINT} options={options}>
      <form id="form" onSubmit={(event) => event.preventDefault()}>
        <input id="field" defaultValue="" />
        <button id="button" type="button">Go</button>
      </form>
    </AnalyticsProvider>
  )
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

async function exercise() {
  click(byId('button'))
  change(byId<HTMLInputElement>('field'), 'typed value')
  act(() => {
    byId<HTMLFormElement>('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  act(() => window.history.pushState(null, '', '/next'))
  await settle()
  return fetch.events().map((event) => event.eventType)
}

describe('capture switches', () => {
  it.each<[keyof CaptureOptions, string[]]>([
    ['pageViews', ['pageview', 'pageview']],
    ['clicks', ['click']],
    ['formSubmits', ['form_submit']],
    ['inputChanges', ['input_interaction']],
  ])('capture.%s enables only its own events', async (key, expected) => {
    render(<Page options={{ capture: { [key]: true } }} />)
    expect(await exercise()).toEqual(expected)
  })

  it('attaches no page-wide listeners when every switch is off', () => {
    const documentListeners = vi.spyOn(document, 'addEventListener')
    const windowListeners = vi.spyOn(window, 'addEventListener')
    const { pushState } = window.history

    render(<Page options={{ capture: { pageViews: false, clicks: false, formSubmits: false, inputChanges: false } }} />)

    const captureTypes = ['click', 'change', 'submit', 'popstate']
    const attached = [...documentListeners.mock.calls, ...windowListeners.mock.calls].map(([type]) => type)
    expect(attached.filter((type) => captureTypes.includes(type))).toEqual([])
    expect(window.history.pushState).toBe(pushState)
  })
})

describe('deprecated flags', () => {
  it('captureInteractions turns on clicks, form submits, and input changes', async () => {
    render(<Page options={{ captureInteractions: true }} />)
    expect(await exercise()).toEqual(['click', 'input_interaction', 'form_submit'])
  })

  it('capturePageViews turns on page views', async () => {
    render(<Page options={{ capturePageViews: true }} />)
    expect(await exercise()).toEqual(['pageview', 'pageview'])
  })

  it('an explicit capture key overrides the deprecated flag', async () => {
    render(<Page options={{ captureInteractions: true, capture: { inputChanges: false } }} />)
    expect(await exercise()).toEqual(['click', 'form_submit'])
  })
})
