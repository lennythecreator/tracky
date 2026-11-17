import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Example } from '../website/docs/app/src/Example.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
let host: HTMLDivElement | undefined

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
})

describe('docs live example', () => {
  it('shows the event a primitive sends and calls no network', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch')

    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root?.render(<Example name="button" />))

    expect(host.textContent).toContain('No event yet.')

    const button = [...host.querySelectorAll('button')].find((candidate) => candidate.textContent === 'Continue')
    expect(button).toBeDefined()

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(host.textContent).toContain('button · activate')
    expect(host.textContent).toContain('docs_continue')
    expect(fetchSpy).not.toHaveBeenCalled()

    const toggle = host.querySelector<HTMLButtonElement>('[aria-expanded]')
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(toggle?.getAttribute('aria-expanded')).toBe('true')
    expect(host.textContent).toContain('export default function ButtonExample')

    fetchSpy.mockRestore()
  })
})
