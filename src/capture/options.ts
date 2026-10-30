import type { AnalyticsOptions, CaptureOptions } from '../types.js'

/**
 * Resolve each page-wide capture switch. A key in `capture` wins; otherwise
 * the deprecated `capturePageViews` and `captureInteractions` flags apply.
 * Everything is off by default.
 */
export function resolveCapture(options: AnalyticsOptions | undefined): Required<CaptureOptions> {
  const capture = options?.capture ?? {}
  const interactions = options?.captureInteractions ?? false
  return {
    pageViews: capture.pageViews ?? options?.capturePageViews ?? false,
    clicks: capture.clicks ?? interactions,
    formSubmits: capture.formSubmits ?? interactions,
    inputChanges: capture.inputChanges ?? interactions,
    frustrationClicks: capture.frustrationClicks ?? false,
  }
}
