import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CodeText, CopyButton } from './CodeBlock'
import { tabIndexForKey } from './tabs'

export interface CodeTab {
  label: string
  language: string
  code: string
}

export interface CodeTabsProps {
  /** One pane per way of doing the same thing; the first is selected. */
  tabs: CodeTab[]
}

/**
 * One change shown several ways. This is a real tablist: one tab in the tab
 * order at a time, Arrow keys wrap, Home and End jump, and each pane stays in the
 * DOM so its `aria-controls` target always exists.
 */
export function CodeTabs({ tabs }: CodeTabsProps) {
  const [active, setActive] = useState(0)
  const base = useId().replace(/:/g, '')
  const current = tabs[active] ?? tabs[0]

  if (!current) return null

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = tabIndexForKey(event.key, active, tabs.length)
    if (next === active) return
    event.preventDefault()
    setActive(next)
    document.getElementById(`${base}-tab-${next}`)?.focus()
  }

  return (
    <div className="docs-code my-5">
      <div className="docs-code-bar">
        <div role="tablist" aria-label="Choose an example" className="docs-code-tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              id={`${base}-tab-${index}`}
              aria-selected={index === active}
              aria-controls={`${base}-panel-${index}`}
              tabIndex={index === active ? 0 : -1}
              className="docs-code-tab"
              onClick={() => setActive(index)}
              onKeyDown={onKeyDown}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <CopyButton code={current.code} />
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.label}
          role="tabpanel"
          id={`${base}-panel-${index}`}
          aria-labelledby={`${base}-tab-${index}`}
          hidden={index !== active}
          tabIndex={0}
        >
          <CodeText code={tab.code} language={tab.language} />
        </div>
      ))}
    </div>
  )
}
