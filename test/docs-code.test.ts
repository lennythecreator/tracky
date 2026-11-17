import { describe, expect, it } from 'vitest'
import { tabIndexForKey } from '../website/docs/app/src/tabs.js'

describe('code tabs', () => {
  it('moves right and left, wrapping at both ends', () => {
    expect(tabIndexForKey('ArrowRight', 0, 3)).toBe(1)
    expect(tabIndexForKey('ArrowRight', 2, 3)).toBe(0)
    expect(tabIndexForKey('ArrowLeft', 0, 3)).toBe(2)
    expect(tabIndexForKey('ArrowLeft', 1, 3)).toBe(0)
  })

  it('jumps to the first and last tab', () => {
    expect(tabIndexForKey('Home', 2, 3)).toBe(0)
    expect(tabIndexForKey('End', 0, 3)).toBe(2)
  })

  it('leaves every other key alone, so Tab and typing are untouched', () => {
    expect(tabIndexForKey('Tab', 1, 3)).toBe(1)
    expect(tabIndexForKey('Enter', 1, 3)).toBe(1)
    expect(tabIndexForKey('ArrowDown', 1, 3)).toBe(1)
  })

  it('handles a single tab', () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      expect(tabIndexForKey(key, 0, 1)).toBe(0)
    }
  })
})
