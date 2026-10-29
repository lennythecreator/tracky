import {
  ButtonDemo,
  CheckboxDemo,
  InputDemo,
  LabelDemo,
  SelectDemo,
  SwitchDemo,
  TextareaDemo,
} from './demos'
import { EventPreview } from './EventPreview'
import { PrimitiveCard } from './PrimitiveCard'

const NAV = [
  ['button', 'Button'],
  ['input', 'Input'],
  ['textarea', 'Textarea'],
  ['label', 'Label'],
  ['checkbox', 'Checkbox'],
  ['switch', 'Switch'],
  ['select', 'Select'],
] as const

const NAV_LINK =
  'rounded-full border border-[var(--pg-line)] bg-white px-3 py-1 text-[11px] font-semibold text-[var(--pg-accent-ink)] transition hover:border-[#a5c7e8] hover:bg-[var(--pg-tint)]'

export function App() {
  return (
    <div className="min-h-dvh bg-[var(--pg-wash)]">
      <header className="sticky top-0 z-20 border-b border-[var(--pg-line)] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3">
          <a href="../../index.html" className="flex items-center gap-[0.55rem] text-[1.25rem] font-bold tracking-[-0.035em] text-[var(--pg-ink)]">
            {/* Same mark as the landing page header. */}
            <svg viewBox="0 0 32 32" className="h-[30px] w-[30px] shrink-0 text-[#3e7fb7]" aria-hidden="true">
              <path
                d="M5 8.5h8.5v7H21v8h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="5" cy="8.5" r="2.5" fill="currentColor" />
              <circle cx="13.5" cy="15.5" r="2.5" fill="currentColor" />
              <circle cx="21" cy="23.5" r="2.5" fill="currentColor" />
              <circle cx="27" cy="23.5" r="2.5" fill="currentColor" />
            </svg>
            Tracky
            <span className="rounded-full border border-[var(--pg-line)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--pg-soft)]">
              Playground
            </span>
          </a>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-[11px] font-semibold text-[var(--pg-muted)] sm:flex">
              <span className="live-dot" aria-hidden="true" />
              Provider connected
            </span>
            <a
              href="../../index.html"
              className="text-[11px] font-bold text-[var(--pg-accent)] underline-offset-4 hover:underline"
            >
              Back to site
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-[var(--pg-line)] bg-white">
        <div className="mx-auto max-w-[1180px] px-5 pt-9 pb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#3e7fb7]">
            Registry primitives
          </p>
          <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.55rem)] font-bold leading-[1.04] tracking-[-0.03em] text-[var(--pg-ink)]">
            Component playground
          </h1>
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-[var(--pg-muted)]">
            The same source files <code className="font-mono text-[0.85em]">tracky add</code> installs,
            rendered with the SDK&apos;s provider. Change a control and two things update: the state
            your app owns, and the event Tracky actually delivers.
          </p>

          <nav aria-label="Primitives" className="mt-5 flex flex-wrap gap-1.5">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={NAV_LINK}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <PrimitiveCard
              id="button"
              title="Button"
              description="Five variants, three sizes. Every enabled button sends one activation."
              action="button · activate"
              wide
              snippet={`<Button variant="secondary" size="md" analyticsName="playground_continue">
  Continue
</Button>`}
            >
              <ButtonDemo />
            </PrimitiveCard>

            <PrimitiveCard
              id="input"
              title="Input"
              description="Native text field with error and disabled states."
              action={null}
              snippet={`<Label htmlFor="workspace-name">Workspace name</Label>
<Input id="workspace-name" defaultValue="Northstar Studio" />`}
            >
              <InputDemo />
            </PrimitiveCard>

            <PrimitiveCard
              id="textarea"
              title="Textarea"
              description="Multi-line field whose size is ordinary app state."
              action={null}
              snippet={`<Textarea id="release-note" rows={3} defaultValue="Focus styles use the ring token." />`}
            >
              <TextareaDemo />
            </PrimitiveCard>

            <PrimitiveCard
              id="label"
              title="Label"
              description="Binds to its field with htmlFor, no JavaScript involved."
              action={null}
              snippet={`<Label htmlFor="digest">Digest frequency</Label>
<Input id="digest" defaultValue="Weekly" />`}
            >
              <LabelDemo />
            </PrimitiveCard>

            <PrimitiveCard
              id="checkbox"
              title="Checkbox"
              description="Native checkbox that reports the toggle, not the value."
              action="checkbox · toggle"
              snippet={`<Checkbox defaultChecked analyticsName="weekly_email" />`}
            >
              <CheckboxDemo />
            </PrimitiveCard>

            <PrimitiveCard
              id="switch"
              title="Switch"
              description="A checkbox with switch semantics and a sliding thumb."
              action="switch · toggle"
              snippet={`<Switch defaultChecked analyticsName="weekly_digest" role="switch" />`}
            >
              <SwitchDemo />
            </PrimitiveCard>

            <PrimitiveCard
              id="select"
              title="Select"
              description="Native select with invalid and disabled states."
              action="select · change"
              snippet={`<Select defaultValue="team" analyticsName="plan">
  <option value="starter">Starter</option>
  <option value="team">Team</option>
  <option value="enterprise">Enterprise</option>
</Select>`}
            >
              <SelectDemo />
            </PrimitiveCard>
          </div>

          <EventPreview />
        </div>

        <footer className="mt-7 flex flex-wrap items-start justify-between gap-4 border-t border-[var(--pg-line)] pt-4 text-[11px] leading-relaxed text-[var(--pg-soft)]">
          <p className="max-w-[70ch]">
            Each component reads the nearest provider through <code>useAnalyticsOptional()</code>, so it
            stays usable without one. The preview answers the SDK&apos;s own request; it does not
            configure a destination or collect data.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em]">tracky 0.1.0</p>
        </footer>
      </main>
    </div>
  )
}
