import { useState } from 'react'
import type { AnalyticsEvent } from 'tracky'
import { SAMPLE_EVENT } from './preview'
import { usePreviewEvents } from './useEventStream'

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)

  return Number.isNaN(date.getTime())
    ? timestamp
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function eventTitle(event: AnalyticsEvent): string {
  return event.component ? `${event.component.name} · ${event.component.action}` : event.eventType
}

interface Entry {
  key: string
  event: AnalyticsEvent
  sample: boolean
}

export function EventPreview() {
  const events = usePreviewEvents(8)
  const [clearedBefore, setClearedBefore] = useState<string | null>(null)
  const visible = clearedBefore
    ? events.filter((event) => event.timestamp > clearedBefore)
    : events
  const entries: Entry[] =
    visible.length > 0
      ? visible.map((event, index) => ({ key: `${event.timestamp}-${index}`, event, sample: false }))
      : clearedBefore
        ? []
        : [{ key: 'sample', event: SAMPLE_EVENT, sample: true }]

  return (
    <aside
      aria-labelledby="event-preview-title"
      className="surface p-4 lg:sticky lg:top-[5.25rem]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="event-preview-title"
          className="flex items-center gap-2 text-[0.9rem] font-bold tracking-tight text-[var(--pg-ink)]"
        >
          <span className="live-dot" aria-hidden="true" />
          Event stream
        </h2>
        <span className="rounded-full bg-[var(--pg-tint)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--pg-accent-ink)]">
          {visible.length}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-[var(--pg-muted)]">
        The SDK posts to <code className="font-mono">tracky-preview.invalid</code>, which this page
        answers itself. Nothing reaches a network.
      </p>

      {entries.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-[var(--pg-line)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--pg-soft)]">
          Cleared. Activate a control to stream its event again.
        </p>
      ) : null}

      <ol aria-live="polite" className="mt-3 max-h-[26rem] overflow-y-auto">
        {entries.map((entry) => (
          <li
            key={entry.key}
            className="event-entry border-t border-[var(--pg-line)] py-3 first:border-t-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[12px] font-bold text-[var(--pg-ink)]">
                {eventTitle(entry.event)}
              </span>
              <time className="font-mono text-[10px] text-[var(--pg-soft)]" dateTime={entry.event.timestamp}>
                {entry.sample ? 'example' : formatTime(entry.event.timestamp)}
              </time>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1">
              {entry.sample ? (
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-[var(--pg-soft)]">
                  sample
                </span>
              ) : null}
              <span className="rounded-sm bg-[var(--pg-tint)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--pg-accent-ink)]">
                {entry.event.eventType}
              </span>
              {Object.entries(entry.event.context).map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-[var(--pg-muted)]"
                >
                  {key}: {String(value)}
                </span>
              ))}
            </div>

            <details className="group mt-1.5">
              <summary className="cursor-pointer list-none text-[10px] font-semibold text-[var(--pg-soft)] hover:text-[var(--pg-accent)]">
                <span className="group-open:hidden">Show JSON</span>
                <span className="hidden group-open:inline">Hide JSON</span>
              </summary>
              <pre className="mt-1.5 overflow-x-auto rounded-md bg-[#142f4b] p-2 text-[10.5px] leading-relaxed text-[#dceaf7]">
                <code>{JSON.stringify(entry.event, null, 2)}</code>
              </pre>
            </details>
          </li>
        ))}
      </ol>

      {visible.length > 0 ? (
        <button
          type="button"
          onClick={() => setClearedBefore(new Date().toISOString())}
          className="mt-2 w-full rounded-md border border-[var(--pg-line)] px-2 py-1.5 text-[11px] font-semibold text-[var(--pg-muted)] transition hover:border-[#a5c7e8] hover:bg-[var(--pg-tint)] hover:text-[var(--pg-accent-ink)]"
        >
          Clear stream
        </button>
      ) : null}

      <dl className="mt-2 grid gap-1 border-t border-[var(--pg-line)] pt-3 text-[10.5px]">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[var(--pg-soft)]">page capture</dt>
          <dd className="font-mono font-semibold text-[var(--pg-ink)]">off</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[var(--pg-soft)]">batch size</dt>
          <dd className="font-mono font-semibold text-[var(--pg-ink)]">1</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[var(--pg-soft)]">field values</dt>
          <dd className="font-mono font-semibold text-[var(--pg-ink)]">never read</dd>
        </div>
      </dl>
    </aside>
  )
}
