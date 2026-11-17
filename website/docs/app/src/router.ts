import { useEffect, useState } from 'react'

/**
 * The directory the app is served from: `/docs` on the site, and '' in the dev
 * server. A URL inside the built folder (`/docs/dist/guides`) maps to the same
 * route as the deployed one.
 */
export function appBase(): string {
  const match = window.location.pathname.match(/^(.*?\/docs)(?=\/dist(?:\/|$)|\/|$)/)
  return match ? match[1] : ''
}

export function currentRoute(): string {
  const path = window.location.pathname
    .slice(appBase().length)
    .replace(/^\/dist(?=\/|$)/, '')
    .replace(/\/+$/, '')
  return path || '/'
}

export function hrefFor(route: string): string {
  return `${appBase()}${route === '/' ? '/' : route}`
}

/**
 * Client-side routing for the docs app: one document, real URLs. The site
 * rewrites `/docs/*` to the app, so a copied link or a reload lands on the same
 * page.
 */
export function useRoute() {
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const onPopState = () => setRoute(currentRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (next: string) => {
    const href = hrefFor(next)
    if (window.location.pathname !== href) window.history.pushState(null, '', href)
    setRoute(currentRoute())
    window.scrollTo({ top: 0 })
  }

  return { route, navigate }
}
