import { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AnalyticsProvider } from '../src/index.js'
import type { CaptureOptions } from '../src/types.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { cleanup, render } from './render.js'

let fetch: FetchStub

beforeEach(() => {
  vi.useFakeTimers()
  window.sessionStorage.clear()
  fetch = stubFetch()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function Page({ capture = { frustrationClicks: true } }: { capture?: CaptureOptions }) {
  return (
    <AnalyticsProvider endpoint={ENDPOINT} options={{ capture }}>
      <button id="a" type="button">A</button>
      <button id="b" type="button">B</button>
      <img id="hero" alt="" />
      <button id="named-1" type="button" data-analytics-name="add_to_cart">Add</button>
      <button id="named-2" type="button" data-analytics-name="add_to_cart">Add</button>
      <div data-analytics="ignore"><button id="ignored" type="button">Ignored</button></div>
    </AnalyticsProvider>
  )
}

/** A pointer click (`detail` 1), then advance the clock. */
async function clickAt(id: string, waitMs = 100, detail = 1) {
  act(() => {
    document.getElementById(id)!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }))
  })
  await vi.advanceTimersByTimeAsync(waitMs)
}

const frustrations = () => fetch.events().filter((event) => event.eventType === 'frustration_click')

it('sends nothing for two clicks and one event for three within a second', async () => {
  render(<Page />)
  await clickAt('a')
  await clickAt('a')
  await settle()
  expect(frustrations()).toEqual([])

  await clickAt('a')
  await clickAt('a')
  await clickAt('a')
  await settle()
  expect(frustrations().map((event) => event.context)).toEqual([{ tag: 'button', id: 'a' }])
})

it('sends one event per burst, however long it lasts', async () => {
  render(<Page />)
  for (let i = 0; i < 8; i += 1) await clickAt('a', 200)
  await settle()

  expect(frustrations()).toHaveLength(1)
})

it('does not combine different elements or clicks spaced beyond the window', async () => {
  render(<Page />)
  await clickAt('a')
  await clickAt('b')
  await clickAt('a')
  await clickAt('b')
  await settle()

  await clickAt('a', 600)
  await clickAt('a', 600)
  await clickAt('a', 600)
  await settle()

  expect(frustrations()).toEqual([])
})

it('groups instances that share a data-analytics-name', async () => {
  render(<Page />)
  await clickAt('named-1')
  await clickAt('named-2')
  await clickAt('named-1')
  await settle()

  expect(frustrations().map((event) => event.context.name)).toEqual(['add_to_cart'])
})

it('counts clicks on non-interactive elements', async () => {
  render(<Page />)
  for (let i = 0; i < 3; i += 1) await clickAt('hero')
  await settle()

  expect(frustrations().map((event) => event.context)).toEqual([{ tag: 'img', id: 'hero' }])
})

it('ignores keyboard activation and ignored subtrees', async () => {
  render(<Page />)
  for (let i = 0; i < 3; i += 1) await clickAt('a', 100, 0)
  for (let i = 0; i < 3; i += 1) await clickAt('ignored')
  await settle()

  expect(frustrations()).toEqual([])
})

it('works without click capture and does not turn it on', async () => {
  render(<Page />)
  for (let i = 0; i < 3; i += 1) await clickAt('a')
  await settle()

  expect(fetch.events().map((event) => event.eventType)).toEqual(['frustration_click'])
})

it('stays off unless its switch is on', async () => {
  render(<Page capture={{ clicks: true }} />)
  for (let i = 0; i < 3; i += 1) await clickAt('a')
  await settle()

  expect(fetch.events().map((event) => event.eventType)).toEqual(['click', 'click', 'click'])
})
