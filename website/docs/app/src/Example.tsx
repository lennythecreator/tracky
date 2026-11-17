import { useEffect, useId, useState } from 'react'
import type { ComponentType } from 'react'
import { AnalyticsProvider } from 'tracky'
import type { AnalyticsEvent } from 'tracky'
import { installPreviewTransport, PREVIEW_ENDPOINT } from '../../../shared/preview'
import { usePreviewEvents } from '../../../shared/usePreviewEvents'
import { CodeSurface } from './CodeBlock'

const demos = import.meta.glob<{ default: ComponentType }>('../examples/*.tsx', { eager: true })
const sources = import.meta.glob<string>('../examples/*.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
})

export interface ExampleProps {
  /** The file name in `app/examples`, without `.tsx`, such as `button`. */
  name: string
  /**
   * `false` for a primitive that sends nothing. The demo still renders, but the
   * readout would otherwise claim no event had happened yet.
   */
  sendsEvents?: boolean
}

function EventReadout({ name }: { name: string }) {
  const events = usePreviewEvents(20)
  const last = events.find((event: AnalyticsEvent) => event.component?.name === name)

  return (
    <div className="docs-example-readout mt-3 rounded-md border border-border bg-background px-3 py-2 text-sm" aria-live="polite">
      {last?.component ? (
        <p>
          <span className="font-mono text-xs font-semibold text-muted-foreground">tracky sends</span>{' '}
          <code>
            {last.component.name} · {last.component.action}
          </code>
          {last.context.name ? (
            <span className="text-muted-foreground"> with name {String(last.context.name)}</span>
          ) : null}
        </p>
      ) : (
        <p className="text-muted-foreground">
          No event yet. Interact with the example; the endpoint is answered inside this page.
        </p>
      )}
    </div>
  )
}

/**
 * One live primitive rendered from the registry source, with the event it sends
 * and the exact file that produced it. The demo and the listing come from the
 * same import, so they cannot drift.
 */
export function Example({ name, sendsEvents = true }: ExampleProps) {
  const source = sources[`../examples/${name}.tsx`]
  const Demo = demos[`../examples/${name}.tsx`]?.default
  const [open, setOpen] = useState(false)
  const panelId = `${useId().replace(/:/g, '')}-source`

  useEffect(installPreviewTransport, [])

  if (!Demo || source === undefined) {
    throw new Error(`The docs example "${name}" does not exist in website/docs/app/examples/.`)
  }

  return (
    <div className="my-6 rounded-md border border-border p-4">
      <AnalyticsProvider
        endpoint={PREVIEW_ENDPOINT}
        options={{ batchSize: 1, maxRetries: 0, flushIntervalMs: 0 }}
      >
        <Demo />
      </AnalyticsProvider>
      {sendsEvents ? (
        <EventReadout name={name} />
      ) : (
        <p className="docs-example-readout mt-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          This primitive sends no component event. Its value and text stay in your app.
        </p>
      )}
      <button
        type="button"
        className="docs-example-source docs-code-copy mt-3"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide source' : 'Show source'}
      </button>
      <div id={panelId} hidden={!open}>
        <CodeSurface code={source.trimEnd()} language="tsx" />
      </div>
    </div>
  )
}
