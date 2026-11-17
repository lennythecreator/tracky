// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { appBase, currentRoute, hrefFor } from '../website/docs/app/src/router.js'

describe('docs routes', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('maps clean, built, and trailing-slash URLs to the same route', () => {
    for (const [path, route] of [
      ['/docs', '/'],
      ['/docs/', '/'],
      ['/docs/sdk/getting-started', '/sdk/getting-started'],
      ['/docs/sdk/getting-started/', '/sdk/getting-started'],
      ['/docs/dist/sdk/getting-started/', '/sdk/getting-started'],
    ]) {
      window.history.replaceState(null, '', path)
      expect(currentRoute()).toBe(route)
    }
  })

  it('builds links under the deployed docs base', () => {
    window.history.replaceState(null, '', '/docs/sdk/getting-started')

    expect(appBase()).toBe('/docs')
    expect(hrefFor('/')).toBe('/docs/')
    expect(hrefFor('/sdk/getting-started')).toBe('/docs/sdk/getting-started')
  })
})
