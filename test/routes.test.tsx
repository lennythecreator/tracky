import { readFileSync } from 'node:fs'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider, hashResolver, pathResolver, stripBasePath } from '../src/index.js'
import type { AnalyticsOptions } from '../src/types.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { cleanup, render } from './render.js'

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

/** The parts of a location a resolver reads. */
function fakeLocation(url: string): Location {
  const parsed = new URL(url, 'https://app.example.com')
  return { pathname: parsed.pathname, search: parsed.search, hash: parsed.hash } as Location
}

function App({ options }: { options?: AnalyticsOptions }) {
  return <AnalyticsProvider endpoint={ENDPOINT} options={options}>{null}</AnalyticsProvider>
}

const pageViews = () => fetch.events().filter((event) => event.eventType === 'pageview').map((event) => event.route)

async function navigate(url: string) {
  act(() => window.history.pushState(null, '', url))
  await vi.advanceTimersByTimeAsync(0)
}

describe('pathResolver', () => {
  it('returns path plus query and ignores the hash', () => {
    expect(pathResolver()(fakeLocation('/reports?tab=exports#section'))).toBe('/reports?tab=exports')
  })

  it('strips a base path', () => {
    const resolve = pathResolver({ basePath: '/app' })

    expect(resolve(fakeLocation('/app/reports?tab=exports'))).toBe('/reports?tab=exports')
    expect(resolve(fakeLocation('/app'))).toBe('/')
    expect(resolve(fakeLocation('/app?tab=1'))).toBe('/?tab=1')
  })

  it('leaves a path outside the base path alone', () => {
    const resolve = pathResolver({ basePath: 'app/' })

    expect(resolve(fakeLocation('/application'))).toBe('/application')
    expect(resolve(fakeLocation('/reports'))).toBe('/reports')
  })
})

describe('stripBasePath', () => {
  it('is safe to apply when the base path is already gone', () => {
    expect(stripBasePath('/reports?tab=1', '/app')).toBe('/reports?tab=1')
    expect(stripBasePath(stripBasePath('/app/reports', '/app'), '/app')).toBe('/reports')
  })

  it('normalizes the base path it is given', () => {
    expect(stripBasePath('/app/reports', 'app/')).toBe('/reports')
    expect(stripBasePath('/app/reports', '/app/')).toBe('/reports')
    expect(stripBasePath('/reports', '')).toBe('/reports')
  })
})

describe('hashResolver', () => {
  it('reads the route from the hash', () => {
    const resolve = hashResolver()

    expect(resolve(fakeLocation('/#/settings'))).toBe('/settings')
    expect(resolve(fakeLocation('/#/settings/billing?tab=1'))).toBe('/settings/billing?tab=1')
  })

  it('falls back when the hash is not a route', () => {
    expect(hashResolver()(fakeLocation('/#pricing'))).toBe('/')
    expect(hashResolver()(fakeLocation('/'))).toBe('/')
    expect(hashResolver({ fallback: '/home' })(fakeLocation('/#pricing'))).toBe('/home')
  })
})

describe('recipes against the live history', () => {
  it('hash routing produces one page view per hash change', async () => {
    render(<App options={{ capture: { pageViews: true }, resolveRoute: hashResolver() }} />)
    await navigate('/#/settings')
    await navigate('/#/settings/billing')
    await settle()

    expect(pageViews()).toEqual(['/', '/settings', '/settings/billing'])
  })

  it('path routing still ignores hash changes', async () => {
    render(<App options={{ capture: { pageViews: true }, resolveRoute: pathResolver() }} />)
    await navigate('/#/pricing')
    await settle()

    expect(pageViews()).toEqual(['/'])
  })

  it('a base path is stripped from page views', async () => {
    render(<App options={{ capture: { pageViews: true }, resolveRoute: pathResolver({ basePath: '/app' }) }} />)
    await navigate('/app/reports?tab=exports')
    await settle()

    expect(pageViews()).toEqual(['/', '/reports?tab=exports'])
  })
})

describe('dependencies', () => {
  it('adds no runtime or peer dependency', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }

    expect(pkg.dependencies ?? {}).toEqual({})
    expect(Object.keys(pkg.peerDependencies ?? {})).toEqual(['react'])
  })

  it('imports no router package', () => {
    for (const file of ['src/routes.ts', 'src/index.ts']) {
      const source = readFileSync(file, 'utf8')
      expect(source).not.toMatch(/from '(?:react-router|next)/)
    }
  })
})
