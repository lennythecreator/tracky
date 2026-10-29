import { useState } from 'react'
import { Button } from '../../../../registry/components/ui/button'
import { Checkbox } from '../../../../registry/components/ui/checkbox'
import { Input } from '../../../../registry/components/ui/input'
import { Label } from '../../../../registry/components/ui/label'
import { Select } from '../../../../registry/components/ui/select'
import { Switch } from '../../../../registry/components/ui/switch'
import { Textarea } from '../../../../registry/components/ui/textarea'
import { StateChips } from './PrimitiveCard'
import { useLastEvent } from './useEventStream'

const CANVAS = 'inset-canvas mt-4 p-4'
const NOTE = 'mt-3 text-[11px] leading-relaxed text-[var(--pg-soft)]'

export function ButtonDemo() {
  const [activations, setActivations] = useState(0)
  const last = useLastEvent('button')
  const activate = () => setActivations((count) => count + 1)

  return (
    <>
      <div className={`${CANVAS} grid gap-4 sm:grid-cols-2`}>
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--pg-soft)]">
            variants
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={activate}>Primary</Button>
            <Button variant="secondary" onClick={activate}>
              Secondary
            </Button>
            <Button variant="outline" onClick={activate}>
              Outline
            </Button>
            <Button variant="ghost" onClick={activate}>
              Ghost
            </Button>
            <Button variant="destructive" onClick={activate}>
              Delete
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--pg-soft)]">
            sizes
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={activate}>
              Small
            </Button>
            <Button size="md" onClick={activate}>
              Medium
            </Button>
            <Button size="lg" onClick={activate}>
              Large
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </div>

      <StateChips
        app={[['activations', activations]]}
        tracky={last?.component ? `${last.component.name} · ${last.component.action}` : undefined}
      />

      <p className={NOTE}>
        Enter and Space send the same <code>activate</code> action as a click. The disabled button is
        skipped by Tab, so it never reaches the SDK.
      </p>
    </>
  )
}

export function InputDemo() {
  const [focused, setFocused] = useState<string | null>(null)

  return (
    <>
      <div className={`${CANVAS} space-y-3`}>
        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="playground-name">Workspace name</Label>
          <Input
            id="playground-name"
            defaultValue="Northstar Studio"
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
          />
        </div>

        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="playground-slug">Workspace slug</Label>
          <Input
            id="playground-slug"
            aria-invalid="true"
            aria-describedby="playground-slug-error"
            defaultValue="northstar studio"
            onFocus={() => setFocused('slug')}
            onBlur={() => setFocused(null)}
          />
          <p id="playground-slug-error" className="text-xs text-destructive">
            Use lowercase letters and dashes.
          </p>
        </div>

        <Input disabled placeholder="Disabled" aria-label="Disabled example" className="max-w-sm" />
      </div>

      <StateChips app={[['focus', focused ?? 'none']]} tracky="nothing, ever" />

      <p className={NOTE}>
        Typing stays in the field. The component reads no value and sends no event, so even this
        page cannot show you what you typed.
      </p>
    </>
  )
}

export function TextareaDemo() {
  const [focused, setFocused] = useState(false)
  const [rows, setRows] = useState(3)

  return (
    <>
      <div className={`${CANVAS} space-y-3`}>
        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="playground-note">Release note</Label>
          <Textarea
            id="playground-note"
            rows={rows}
            defaultValue="Focus styles use the ring token."
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRows((value) => Math.min(6, value + 1))}>
            More rows
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRows((value) => Math.max(2, value - 1))}>
            Fewer rows
          </Button>
          <span className="text-[11px] text-[var(--pg-soft)]">rows: {rows}</span>
        </div>

        <Textarea
          disabled
          rows={3}
          placeholder="Disabled"
          aria-label="Disabled textarea example"
          className="max-w-sm"
        />
      </div>

      <StateChips app={[['focus', focused ? 'note' : 'none'], ['rows', rows]]} tracky="nothing, ever" />

      <p className={NOTE}>
        The resize buttons are ordinary app state. Growing the textarea does not touch the SDK, and
        the typed text never leaves the element. Tab skips the disabled field, so it never reaches
        the SDK either.
      </p>
    </>
  )
}

export function LabelDemo() {
  const [focused, setFocused] = useState(false)

  return (
    <>
      <div className={CANVAS}>
        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="playground-digest">Digest frequency</Label>
          <Input
            id="playground-digest"
            defaultValue="Weekly"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <p className="mt-1 text-[11px] text-[var(--pg-soft)]">
            Click the label, or focus the field: {focused ? 'the input has focus.' : 'nothing focused yet.'}
          </p>
        </div>
      </div>

      <StateChips app={[['input focus', focused ? 'yes' : 'no']]} tracky="nothing, ever" />

      <p className={NOTE}>
        The label is a native <code>label</code> bound with <code>htmlFor</code>, so pressing it moves
        focus to the field without JavaScript.
      </p>
    </>
  )
}

export function CheckboxDemo() {
  const [weekly, setWeekly] = useState(false)
  const [summary, setSummary] = useState(true)
  const last = useLastEvent('checkbox')

  return (
    <>
      <div className={`${CANVAS} space-y-2.5`}>
        <label className="flex items-center gap-2.5 text-sm text-[var(--pg-ink)]">
          <Checkbox
            analyticsName="weekly_email"
            checked={weekly}
            onChange={(event) => setWeekly(event.currentTarget.checked)}
          />
          Weekly product email
        </label>

        <label className="flex items-center gap-2.5 text-sm text-[var(--pg-ink)]">
          <Checkbox checked={summary} onChange={(event) => setSummary(event.currentTarget.checked)} />
          Include usage summary
        </label>

        <label className="flex items-center gap-2.5 text-sm text-[var(--pg-soft)]">
          <Checkbox disabled defaultChecked />
          Managed by your admin
        </label>
      </div>

      <StateChips
        app={[['weekly email', String(weekly)], ['usage summary', String(summary)]]}
        tracky={last?.component ? `${last.component.name} · ${last.component.action}` : undefined}
      />

      <p className={NOTE}>
        Space toggles the focused checkbox. The event carries the component name, the action, and the
        optional <code>analyticsName</code> — never the checked state.
      </p>
    </>
  )
}

export function SwitchDemo() {
  const [digest, setDigest] = useState(true)
  const [sync, setSync] = useState(false)
  const last = useLastEvent('switch')

  return (
    <>
      <div className={`${CANVAS} space-y-2.5`}>
        <label className="flex items-center gap-2.5 text-sm text-[var(--pg-ink)]">
          <Switch
            analyticsName="weekly_digest"
            checked={digest}
            onChange={(event) => setDigest(event.currentTarget.checked)}
          />
          Weekly digest
        </label>

        <label className="flex items-center gap-2.5 text-sm text-[var(--pg-ink)]">
          <Switch checked={sync} onChange={(event) => setSync(event.currentTarget.checked)} />
          Sync on save
        </label>

        <label className="flex items-center gap-2.5 text-sm text-[var(--pg-soft)]">
          <Switch disabled />
          Managed by your admin
        </label>
      </div>

      <StateChips
        app={[['digest', String(digest)], ['sync on save', String(sync)]]}
        tracky={last?.component ? `${last.component.name} · ${last.component.action}` : undefined}
      />

      <p className={NOTE}>
        The switch reports <code>role="switch"</code> with a native checkbox underneath, so Space
        toggles it and the event still describes the interaction only.
      </p>
    </>
  )
}

const PLANS = [
  ['starter', 'Starter'],
  ['team', 'Team'],
  ['enterprise', 'Enterprise'],
] as const

export function SelectDemo() {
  const [plan, setPlan] = useState('team')
  const [region, setRegion] = useState('')
  const last = useLastEvent('select')

  return (
    <>
      <div className={`${CANVAS} space-y-3`}>
        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="playground-plan">Plan</Label>
          <Select
            id="playground-plan"
            value={plan}
            analyticsName="plan"
            onChange={(event) => setPlan(event.currentTarget.value)}
          >
            {PLANS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="playground-region">Workspace region</Label>
          <Select
            id="playground-region"
            aria-invalid="true"
            aria-describedby="playground-region-error"
            value={region}
            onChange={(event) => setRegion(event.currentTarget.value)}
          >
            <option value="" disabled>
              Choose a region
            </option>
            <option value="eu">Europe</option>
            <option value="us">United States</option>
          </Select>
          <p id="playground-region-error" className="text-xs text-destructive">
            Choose the region that stores your events.
          </p>
        </div>

        <Select disabled defaultValue="team" aria-label="Disabled select example" className="max-w-sm">
          <option value="team">Team</option>
        </Select>
      </div>

      <StateChips
        app={[['plan', plan], ['region', region || 'unset']]}
        tracky={last?.component ? `${last.component.name} · ${last.component.action}` : undefined}
      />

      <p className={NOTE}>
        Changing the selection updates your state and sends one <code>change</code> action. The chosen
        option is not part of the event.
      </p>
    </>
  )
}
