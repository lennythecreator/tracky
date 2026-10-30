import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider } from '../src/index.js'
import { Button, Checkbox, Input, Select, Switch, Textarea } from '../registry/components/ui/index.js'
import { ENDPOINT, settle, stubFetch, type FetchStub } from './helpers.js'
import { change, cleanup, click, render } from './render.js'

let fetch: FetchStub

beforeEach(() => {
  vi.useFakeTimers()
  window.sessionStorage.clear()
  fetch = stubFetch()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

function Controls() {
  return (
    <>
      <Button id="save" analyticsName="save_report">Save report</Button>
      <Checkbox id="terms" aria-label="Accept terms" />
      <Switch id="digest" aria-label="Weekly digest" analyticsName="digest" />
      <Select id="plan" aria-label="Plan" defaultValue="free">
        <option value="free">Free</option>
        <option value="team">Team</option>
      </Select>
      <Input id="email" aria-label="Email" defaultValue="" />
      <Textarea id="notes" aria-label="Notes" defaultValue="" />
    </>
  )
}

describe('registry primitives', () => {
  it('send their documented action and no values, labels, or props', async () => {
    // Page-wide capture is on to check the generic click is suppressed.
    render(
      <AnalyticsProvider endpoint={ENDPOINT} options={{ captureInteractions: true }}>
        <Controls />
      </AnalyticsProvider>,
    )
    click(byId('save'))
    change(byId<HTMLInputElement>('terms'))
    change(byId<HTMLInputElement>('digest'))
    change(byId<HTMLSelectElement>('plan'), 'team')
    change(byId<HTMLInputElement>('email'), 'person@example.com')
    change(byId<HTMLTextAreaElement>('notes'), 'private note text')
    await settle()

    const componentEvents = fetch.events().filter((event) => event.eventType === 'component_interaction')
    expect(componentEvents.map((event) => [event.component, event.context])).toEqual([
      [{ name: 'button', action: 'activate' }, { name: 'save_report' }],
      [{ name: 'checkbox', action: 'toggle' }, {}],
      [{ name: 'switch', action: 'toggle' }, { name: 'digest' }],
      [{ name: 'select', action: 'change' }, {}],
    ])
    expect(fetch.events().filter((event) => event.eventType === 'click')).toEqual([])

    const sent = fetch.bodies().join('\n')
    for (const text of ['Save report', 'Accept terms', 'team', 'person@example.com', 'private note text']) {
      expect(sent).not.toContain(text)
    }
  })

  it('stay usable without a provider and call the caller handlers', async () => {
    const onClick = vi.fn()
    const onChange = vi.fn()
    render(
      <>
        <Button id="save" onClick={onClick}>Save</Button>
        <Checkbox id="terms" aria-label="Accept terms" onChange={onChange} />
      </>,
    )
    click(byId('save'))
    change(byId<HTMLInputElement>('terms'))
    await settle()

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(fetch.mock).not.toHaveBeenCalled()
  })

  it('skip the Button event when the caller prevents default', async () => {
    render(
      <AnalyticsProvider endpoint={ENDPOINT}>
        <Button id="save" onClick={(event) => event.preventDefault()}>Save</Button>
      </AnalyticsProvider>,
    )
    click(byId('save'))
    await settle()

    expect(fetch.mock).not.toHaveBeenCalled()
  })
})
