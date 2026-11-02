import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider, useAnalytics, useAnalyticsOptional } from '../src/index.js'
import type { AnalyticsOptions } from '../src/types.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { change, cleanup, click, render } from './render.js'

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

function Page({ options }: { options?: AnalyticsOptions }) {
  return (
    <AnalyticsProvider endpoint={ENDPOINT} options={options}>
      <form id="signup" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" defaultValue="" />
        <input id="password" type="password" defaultValue="" />
        <input id="token" type="hidden" defaultValue="hidden-secret" />
        <textarea id="notes" defaultValue="" />
        <select id="plan" defaultValue="free">
          <option value="free">Free</option>
          <option value="team">Team</option>
        </select>
        <button id="submit" type="submit" data-analytics-name="signup_submit">Create account</button>
      </form>
      <div data-analytics="ignore">
        <button id="ignored">Ignored</button>
        <input id="ignored-input" defaultValue="" />
      </div>
      <button id="tracky-button" data-tracky-component="button">Tracky</button>
      <p id="plain">Plain text</p>
    </AnalyticsProvider>
  )
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

/** Exercise every page-wide capture path once. */
function interactWithEverything() {
  change(byId<HTMLInputElement>('email'), 'person@example.com')
  change(byId<HTMLInputElement>('password'), 'hunter2-password')
  change(byId<HTMLTextAreaElement>('notes'), 'private note text')
  change(byId<HTMLSelectElement>('plan'), 'team')
  change(byId<HTMLInputElement>('ignored-input'), 'ignored value')
  click(byId('submit'))
  click(byId('ignored'))
  click(byId('plain'))
  act(() => {
    byId<HTMLFormElement>('signup').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  act(() => window.history.pushState(null, '', '/next'))
}

describe('defaults', () => {
  it('captures nothing page-wide when no capture option is set', async () => {
    render(<Page />)
    interactWithEverything()
    await settle()

    expect(fetch.mock).not.toHaveBeenCalled()
  })

  it('throws from useAnalytics outside a provider, and useAnalyticsOptional returns null', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Strict() {
      useAnalytics()
      return null
    }
    expect(() => render(<Strict />)).toThrow('useAnalytics must be used within an AnalyticsProvider')

    let optional: unknown = 'unset'
    function Optional() {
      optional = useAnalyticsOptional()
      return null
    }
    render(<Optional />)
    expect(optional).toBeNull()
    errors.mockRestore()
  })
})

describe('page views', () => {
  it('sends the initial page view and one page view per route change', async () => {
    render(<Page options={{ capturePageViews: true }} />)
    act(() => window.history.pushState(null, '', '/reports'))
    act(() => window.history.replaceState(null, '', '/reports'))
    act(() => window.history.pushState(null, '', '/reports?tab=exports'))
    await settle()

    expect(fetch.events().map((event) => [event.eventType, event.route])).toEqual([
      ['pageview', '/'],
      ['pageview', '/reports'],
      ['pageview', '/reports?tab=exports'],
    ])
  })

  it('restores the History API on unmount', () => {
    const { pushState, replaceState } = window.history
    const view = render(<Page options={{ capturePageViews: true }} />)
    expect(window.history.pushState).not.toBe(pushState)

    view.unmount()
    expect(window.history.pushState).toBe(pushState)
    expect(window.history.replaceState).toBe(replaceState)
  })
})

describe('interaction capture', () => {
  it('records safe metadata for clicks, changes, and submits', async () => {
    render(<Page options={{ captureInteractions: true }} />)
    click(byId('submit'))
    change(byId<HTMLSelectElement>('plan'), 'team')
    act(() => {
      byId<HTMLFormElement>('signup').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await settle()

    const events = fetch.events()
    expect(events.find((event) => event.eventType === 'click')?.context).toEqual({
      tag: 'button',
      id: 'submit',
      name: 'signup_submit',
    })
    expect(events.find((event) => event.eventType === 'input_interaction')?.context).toEqual({ tag: 'select', id: 'plan' })
    expect(events.find((event) => event.eventType === 'form_submit')?.context).toEqual({ tag: 'form', id: 'signup' })
  })

  it('never sends field values, password input, hidden input, or ignored subtrees', async () => {
    render(<Page options={{ capturePageViews: true, captureInteractions: true }} />)
    interactWithEverything()
    await settle()

    const sent = fetch.bodies().join('\n')
    for (const secret of ['person@example.com', 'hunter2-password', 'private note text', 'hidden-secret', 'ignored value', 'team']) {
      expect(sent).not.toContain(secret)
    }

    const contexts = fetch.events().map((event) => event.context)
    expect(contexts).not.toContainEqual(expect.objectContaining({ id: 'password' }))
    expect(contexts).not.toContainEqual(expect.objectContaining({ id: 'token' }))
    expect(contexts).not.toContainEqual(expect.objectContaining({ id: 'ignored' }))
    expect(contexts).not.toContainEqual(expect.objectContaining({ id: 'ignored-input' }))
  })

  it('does not send a generic click for a Tracky component', async () => {
    render(<Page options={{ captureInteractions: true }} />)
    click(byId('tracky-button'))
    await settle()

    expect(fetch.mock).not.toHaveBeenCalled()
  })

  it('ignores clicks on non-interactive elements', async () => {
    render(<Page options={{ captureInteractions: true }} />)
    click(byId('plain'))
    await settle()

    expect(fetch.mock).not.toHaveBeenCalled()
  })

  it('removes its document listeners on unmount', async () => {
    const view = render(<Page options={{ captureInteractions: true }} />)
    const button = byId('submit')
    view.unmount()
    document.body.append(button)
    click(button)
    await settle()

    expect(fetch.mock).not.toHaveBeenCalled()
  })
})
