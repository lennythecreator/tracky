import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  countHits,
  searchDocs,
  type DocsSearchGroup,
  type DocsSearchIndex,
} from '../../../shared/docsSearch'
import { hrefFor } from './router'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const RESULT_LIMIT = 12

/**
 * Docs search in a native dialog. The header button and Cmd/Ctrl+K both open
 * it; the index loads once, on the first open, from the static file the docs
 * build emits. Results are grouped by page, arrow keys move the active result,
 * Enter opens it at its heading, and closing returns focus to the opener.
 */
export function SearchDialog({
  navigate,
  className,
}: {
  navigate: (route: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [state, setState] = useState<LoadState>('idle')
  const [index, setIndex] = useState<DocsSearchIndex | null>(null)
  const [active, setActive] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const requested = useRef(false)
  const alive = useRef(true)

  const groups = useMemo<DocsSearchGroup[]>(
    () => (index && query.trim() ? searchDocs(index, query, RESULT_LIMIT) : []),
    [index, query],
  )
  const rows = useMemo(() => groups.flatMap((group) => group.hits.map((hit) => ({ group, hit }))), [groups])
  const total = countHits(groups)

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      setOpen(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const element = dialog.current
    if (!element) return

    if (open && !element.open) {
      element.showModal()
      input.current?.focus()
    }
    if (!open && element.open) element.close()
  }, [open])

  useEffect(() => () => {
    alive.current = false
  }, [])

  useEffect(() => {
    // One request for the session: the flag survives closing and reopening the
    // dialog, and the index is cached in state once it arrives.
    if (!open || requested.current) return

    requested.current = true
    setState('loading')

    fetch(`${import.meta.env.BASE_URL}search-index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`the index returned ${response.status}`)
        return response.json() as Promise<DocsSearchIndex>
      })
      .then((next) => {
        if (!alive.current) return
        setIndex(next)
        setState('ready')
      })
      .catch(() => {
        if (alive.current) setState('error')
      })
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  const focusTrigger = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const choose = (position: number) => {
    const row = rows[position]
    if (!row) return

    navigate(row.hit.slug ? `${row.group.route}#${row.hit.slug}` : row.group.route)
    focusTrigger()

    if (row.hit.slug) {
      // The target heading gets its id from the on-this-page pass after render.
      const slug = row.hit.slug
      window.setTimeout(() => document.getElementById(slug)?.scrollIntoView(), 0)
    }
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (rows.length === 0) return
      event.preventDefault()
      setActive((current) =>
        event.key === 'ArrowDown' ? (current + 1) % rows.length : (current - 1 + rows.length) % rows.length,
      )
      return
    }

    if (event.key === 'Enter' && rows[active]) {
      event.preventDefault()
      choose(active)
    }
  }

  let position = 0

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={className}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setOpen(true)}
      >
        Search
      </button>

      <dialog
        ref={dialog}
        className="docs-search-dialog"
        aria-labelledby="docs-search-title"
        onClose={focusTrigger}
      >
        <div className="docs-search-head">
          <h2 id="docs-search-title">Search the docs</h2>
          <button type="button" className="docs-search-close" onClick={focusTrigger}>
            Close
          </button>
        </div>

        <div className="docs-search-field">
          <label htmlFor="docs-search-input" className="sr-only">
            Search the documentation
          </label>
          <input
            ref={input}
            id="docs-search-input"
            type="search"
            autoComplete="off"
            placeholder="Search pages and headings"
            role="combobox"
            aria-expanded={rows.length > 0}
            aria-controls="docs-search-results"
            aria-autocomplete="list"
            aria-activedescendant={rows.length > 0 ? `docs-search-hit-${active}` : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
          />
        </div>

        <p className="docs-search-status" role="status" aria-live="polite">
          {!query.trim()
            ? 'Type to search the docs.'
            : state === 'error'
              ? 'Search is unavailable because the index could not load.'
              : state === 'loading'
                ? 'Loading the index.'
                : `${total} ${total === 1 ? 'result' : 'results'}`}
        </p>

        <div id="docs-search-results" className="docs-search-results" role="listbox" aria-label="Search results">
          {state === 'ready' && query.trim() && total === 0 ? (
            <p className="docs-search-empty">No page matches “{query}”.</p>
          ) : null}

          {groups.map((group, groupIndex) => (
            <section
              key={group.route}
              className="docs-search-group"
              aria-labelledby={`docs-search-group-${groupIndex}`}
            >
              <p id={`docs-search-group-${groupIndex}`} className="docs-search-group-title">
                {group.title}
                <span>{group.section}</span>
              </p>
              <ul>
                {group.hits.map((hit) => {
                  const current = position
                  position += 1
                  const selected = current === active

                  return (
                    <li key={`${group.route}#${hit.slug || 'top'}`}>
                      <a
                        id={`docs-search-hit-${current}`}
                        role="option"
                        aria-selected={selected}
                        className="docs-search-hit"
                        href={hrefFor(hit.slug ? `${group.route}#${hit.slug}` : group.route)}
                        onClick={(event) => {
                          event.preventDefault()
                          choose(current)
                        }}
                        onMouseEnter={() => setActive(current)}
                      >
                        <span className="docs-search-hit-title">{hit.heading || group.title}</span>
                        <span className="docs-search-hit-snippet">{hit.snippet}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </dialog>
    </>
  )
}
