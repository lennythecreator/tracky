import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchDialog } from '../website/docs/app/src/SearchDialog.js'
import type { DocsSearchIndex } from '../website/shared/docsSearch.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const INDEX: DocsSearchIndex = {
  pages: [
    {
      route: '/sdk/privacy-and-exclusions',
      title: 'Privacy and exclusions',
      section: 'Analytics SDK',
      description: 'The capture boundary and what is stored before consent.',
      sections: [
        { heading: 'Consent', slug: 'consent', text: 'The README carries a Cookiebot recipe and a custom banner recipe.' },
      ],
    },
    {
      route: '/sdk/delivery-and-retries',
      title: 'Delivery and retries',
      section: 'Analytics SDK',
      description: 'Batching and bounded retries.',
      sections: [{ heading: 'Retry rules', slug: 'retry-rules', text: 'A 5xx response, 408, or 429 is retried.' }],
    },
  ],
}

let root: Root | undefined
let host: HTMLDivElement | undefined
const navigate = vi.fn()
const fetchMock = vi.fn(async (_input?: string) => ({ ok: true, json: async () => INDEX }))

beforeAll(() => {
  // jsdom has the element but not the modal methods the component calls.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(async () => {
  vi.stubGlobal('fetch', fetchMock)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<SearchDialog navigate={navigate} />))
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  navigate.mockReset()
  fetchMock.mockClear()
  vi.unstubAllGlobals()
})

const trigger = () => [...host!.querySelectorAll('button')].find((button) => button.textContent === 'Search')!
const closeButton = () => [...host!.querySelectorAll('button')].find((button) => button.textContent === 'Close')!

async function open() {
  await act(async () => {
    trigger().dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await act(async () => {})
}

async function type(value: string) {
  const input = host!.querySelector<HTMLInputElement>('#docs-search-input')!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!

  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('docs search dialog', () => {
  it('fetches the index once, on the first open, and nothing on mount', async () => {
    expect(fetchMock).not.toHaveBeenCalled()

    await open()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/search-index.json')

    await act(async () => {
      closeButton().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await open()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('finds a subheading term, announces the count, and opens its anchor on Enter', async () => {
    await open()
    await type('cookiebot')

    expect(host!.textContent).toContain('1 result')
    expect(host!.textContent).toContain('Consent')

    const input = host!.querySelector<HTMLInputElement>('#docs-search-input')!
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(navigate).toHaveBeenCalledWith('/sdk/privacy-and-exclusions#consent')
  })

  it('moves the active result with the arrow keys', async () => {
    await open()
    await type('retried')

    const input = host!.querySelector<HTMLInputElement>('#docs-search-input')!
    expect(input.getAttribute('aria-activedescendant')).toBe('docs-search-hit-0')

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })

    expect(input.getAttribute('aria-activedescendant')).toBe('docs-search-hit-0')
  })

  it('returns focus to the opener when the dialog closes', async () => {
    await open()
    expect(document.activeElement).toBe(host!.querySelector('#docs-search-input'))

    await act(async () => {
      closeButton().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.activeElement).toBe(trigger())
  })
})
