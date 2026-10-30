import { randomId, trackForRoute } from '../client.js'
import type { AnalyticsClient, HeatMapSummary } from '../types.js'
import { isIgnored } from './dom.js'
import { subscribeToRoute } from './navigation.js'

export const HEAT_MAP_COLUMNS = 10
export const HEAT_MAP_ROWS = 10
export const HEAT_MAP_SAMPLE_INTERVAL_MS = 250
/** Long visits send a summary this often, so a crash loses at most one period. */
export const HEAT_MAP_FLUSH_INTERVAL_MS = 30_000
// A focus change this soon after a pointer press came from the pointer.
const POINTER_FOCUS_MS = 500

const REGIONS = HEAT_MAP_COLUMNS * HEAT_MAP_ROWS

interface Visit {
  route: string
  visitId: string
  visitStartedAt: string
  periodStartedAt: string
  pointerMs: number[]
  clicks: number[]
  focusEntries: number[]
  empty: boolean
}

function startVisit(route: string): Visit {
  const now = new Date().toISOString()
  return {
    route,
    visitId: randomId(),
    visitStartedAt: now,
    periodStartedAt: now,
    pointerMs: new Array<number>(REGIONS).fill(0),
    clicks: new Array<number>(REGIONS).fill(0),
    focusEntries: new Array<number>(REGIONS).fill(0),
    empty: true,
  }
}

/** Region index for a viewport point, or -1 outside the visible viewport. */
function regionAt(x: number, y: number): number {
  const width = window.innerWidth
  const height = window.innerHeight
  if (!(width > 0 && height > 0) || x < 0 || y < 0 || x >= width || y >= height) return -1
  const column = Math.min(HEAT_MAP_COLUMNS - 1, Math.floor((x / width) * HEAT_MAP_COLUMNS))
  const row = Math.min(HEAT_MAP_ROWS - 1, Math.floor((y / height) * HEAT_MAP_ROWS))
  return row * HEAT_MAP_COLUMNS + column
}

/**
 * Aggregate pointer time, clicks, and keyboard focus per region in the
 * browser, and send the summary on route change, page exit, every 30 seconds,
 * and when capture stops. Raw coordinates never leave this function.
 */
export function captureHeatMaps(client: AnalyticsClient, resolve: () => string | null): () => void {
  let visit = startVisit(resolve() ?? '')
  let pointer: { x: number; y: number; target: Element | null } | null = null
  let sampler: ReturnType<typeof setInterval> | undefined
  let lastPointerDown = Number.NEGATIVE_INFINITY

  const send = () => {
    if (visit.empty) return
    const periodEndedAt = new Date().toISOString()
    trackForRoute(client, visit.route, 'heatmap', {
      visitId: visit.visitId,
      visitStartedAt: visit.visitStartedAt,
      periodStartedAt: visit.periodStartedAt,
      periodEndedAt,
      columns: HEAT_MAP_COLUMNS,
      rows: HEAT_MAP_ROWS,
      sampleIntervalMs: HEAT_MAP_SAMPLE_INTERVAL_MS,
      pointerMs: visit.pointerMs,
      clicks: visit.clicks,
      focusEntries: visit.focusEntries,
    } satisfies HeatMapSummary)
    visit = {
      ...visit,
      periodStartedAt: periodEndedAt,
      pointerMs: new Array<number>(REGIONS).fill(0),
      clicks: new Array<number>(REGIONS).fill(0),
      focusEntries: new Array<number>(REGIONS).fill(0),
      empty: true,
    }
  }

  const count = (grid: number[], region: number, amount = 1) => {
    if (region < 0) return
    grid[region] += amount
    visit.empty = false
  }

  const sample = () => {
    if (!pointer || document.visibilityState !== 'visible') return
    if (pointer.target && isIgnored(pointer.target)) return
    count(visit.pointerMs, regionAt(pointer.x, pointer.y), HEAT_MAP_SAMPLE_INTERVAL_MS)
  }

  const stopSampling = () => {
    if (sampler) clearInterval(sampler)
    sampler = undefined
    pointer = null
  }

  const onPointerMove = (event: PointerEvent) => {
    // Touch movement is scrolling or dragging, not cursor attention.
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    pointer = { x: event.clientX, y: event.clientY, target: event.target instanceof Element ? event.target : null }
    sampler ??= setInterval(sample, HEAT_MAP_SAMPLE_INTERVAL_MS)
  }

  // `relatedTarget` is null when the pointer leaves the document.
  const onPointerOut = (event: PointerEvent) => {
    if (event.relatedTarget === null) stopSampling()
  }

  const onPointerDown = () => { lastPointerDown = performance.now() }

  const onClick = (event: MouseEvent) => {
    // Keyboard activation sends clicks with `detail` 0 at no real position.
    if (event.detail === 0) return
    if (event.target instanceof Element && isIgnored(event.target)) return
    count(visit.clicks, regionAt(event.clientX, event.clientY))
  }

  const onFocusIn = (event: FocusEvent) => {
    const target = event.target
    if (!(target instanceof Element) || isIgnored(target)) return
    if (performance.now() - lastPointerDown < POINTER_FOCUS_MS) return
    const rect = target.getBoundingClientRect()
    count(visit.focusEntries, regionAt(rect.left + rect.width / 2, rect.top + rect.height / 2))
  }

  const onExit = () => {
    send()
    void client.flush()
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      stopSampling()
      onExit()
    }
  }

  const unsubscribe = subscribeToRoute(resolve, (route) => {
    stopSampling()
    send()
    visit = startVisit(route)
  })
  const periodic = setInterval(send, HEAT_MAP_FLUSH_INTERVAL_MS)

  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true })
  document.addEventListener('pointerout', onPointerOut, true)
  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
  document.addEventListener('click', onClick, true)
  document.addEventListener('focusin', onFocusIn, true)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onExit)
  window.addEventListener('blur', stopSampling)

  return () => {
    unsubscribe()
    clearInterval(periodic)
    stopSampling()
    document.removeEventListener('pointermove', onPointerMove, true)
    document.removeEventListener('pointerout', onPointerOut, true)
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('focusin', onFocusIn, true)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onExit)
    window.removeEventListener('blur', stopSampling)
    send()
  }
}
