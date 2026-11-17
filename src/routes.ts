import type { AnalyticsOptions } from './types.js'

/** The shape `resolveRoute` expects: a location in, a route or `null` out. */
export type RouteResolver = NonNullable<AnalyticsOptions['resolveRoute']>

/** `/app/` becomes `/app`, `app` becomes `/app`, and an empty value stays ''. */
function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Remove an app's base path from a path: `/app/reports?tab=export` becomes
 * `/reports?tab=export`, and the base path itself becomes `/`. A path outside
 * the base path is returned unchanged, so applying this twice is safe.
 */
export function stripBasePath(path: string, basePath: string): string {
  const base = normalizeBasePath(basePath)
  if (!base || !path.startsWith(base)) return path || '/'
  const rest = path.slice(base.length)
  if (rest === '') return '/'
  if (rest.startsWith('/')) return rest
  if (rest.startsWith('?')) return `/${rest}`
  return path
}

/**
 * Path plus query, with an optional base path removed. Hash-only changes keep
 * the same route, which is what the SDK does without a resolver.
 */
export function pathResolver(options: { basePath?: string } = {}): RouteResolver {
  return (location) => stripBasePath(`${location.pathname}${location.search}`, options.basePath ?? '')
}

/**
 * Routes from a hash router: `#/settings` becomes `/settings`. A hash that is
 * not a route, such as `#pricing`, returns `fallback`, which defaults to `/`.
 */
export function hashResolver(options: { fallback?: string } = {}): RouteResolver {
  return (location) => (location.hash.startsWith('#/') ? location.hash.slice(1) : options.fallback ?? '/')
}
