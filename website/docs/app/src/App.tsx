import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { flatPages, pagesByRoute, sectionFor, sections } from './content'
import { hrefFor, useRoute } from './router'
import { Toc } from './Toc'

interface SidebarProps {
  current: string
  onNavigate: (route: string) => void
}

function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <nav aria-label="Documentation" className="space-y-6 text-sm">
      {sections.map((section) => (
        <div key={section.folder || 'root'}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{section.label}</p>
          <ul className="space-y-1">
            {section.pages.map((page) => {
              const active = page.route === current
              return (
                <li key={page.route}>
                  <a
                    href={hrefFor(page.route)}
                    aria-current={active ? 'page' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      onNavigate(page.route)
                    }}
                    className={
                      active
                        ? 'block rounded-sm bg-muted px-3 py-1.5 font-semibold text-foreground'
                        : 'block rounded-sm px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  >
                    {page.title}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

const LABEL = 'text-sm font-semibold'
const BUTTON = 'inline-flex min-h-9 items-center rounded-sm border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function App() {
  const { route, navigate } = useRoute()
  const [navOpen, setNavOpen] = useState(false)
  const page = pagesByRoute.get(route)
  const index = page ? flatPages.indexOf(page) : -1
  const previous = index > 0 ? flatPages[index - 1] : undefined
  const next = index >= 0 && index < flatPages.length - 1 ? flatPages[index + 1] : undefined
  const section = page ? sectionFor(page) : undefined

  useEffect(() => {
    document.title = page ? `${page.title} — Tracky docs` : 'Page not found — Tracky docs'
    let description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.append(description)
    }
    description.content = page?.description || 'Documentation for the Tracky React analytics SDK and component library.'
  }, [page])

  useEffect(() => {
    setNavOpen(false)
  }, [route])

  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  const go = (event: MouseEvent<HTMLAnchorElement>, to: string) => {
    event.preventDefault()
    navigate(to)
  }

  const nav = <Sidebar current={route} onNavigate={navigate} />

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#docs-article"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3">
          <a href={hrefFor('/')} onClick={(event) => go(event, '/')} className="flex items-baseline gap-2">
            <span className={LABEL}>Tracky</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Docs
            </span>
          </a>
          <div className="ml-auto flex items-center gap-2">
            <a href="../playground/dist/" className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:inline">
              Playground
            </a>
            <a href="../" className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:inline">
              Home
            </a>
            <button
              type="button"
              className={`${BUTTON} lg:hidden`}
              aria-expanded={navOpen}
              aria-controls="docs-mobile-nav"
              onClick={() => setNavOpen((open) => !open)}
            >
              {navOpen ? 'Close menu' : 'Menu'}
            </button>
          </div>
        </div>
        {navOpen ? (
          <div id="docs-mobile-nav" className="border-t border-border px-4 py-4 lg:hidden">
            {nav}
          </div>
        ) : null}
      </header>

      <div className="mx-auto flex max-w-[1200px] gap-10 px-4 py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">{nav}</div>
        </aside>

        <main id="docs-article" className="min-w-0 flex-1">
          {page ? (
            <>
              {section ? (
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{section.label}</p>
              ) : null}
              <h1 className="text-3xl font-bold tracking-[-0.02em]">{page.title}</h1>
              {page.description ? <p className="mt-3 max-w-2xl text-base text-muted-foreground">{page.description}</p> : null}
              <article className="docs-prose mt-8">
                <page.Component />
              </article>

              <nav aria-label="Previous and next pages" className="mt-12 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-sm">
                {previous ? (
                  <a
                    href={hrefFor(previous.route)}
                    onClick={(event) => go(event, previous.route)}
                    className="font-semibold text-muted-foreground hover:text-foreground"
                  >
                    ← {previous.title}
                  </a>
                ) : (
                  <span />
                )}
                {next ? (
                  <a
                    href={hrefFor(next.route)}
                    onClick={(event) => go(event, next.route)}
                    className="text-right font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {next.title} →
                  </a>
                ) : (
                  <span />
                )}
              </nav>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-[-0.02em]">Page not found</h1>
              <p className="mt-3 text-muted-foreground">
                No page is authored at <code className="rounded-sm bg-muted px-1 py-0.5">{route}</code>.
              </p>
              <p className="mt-6">
                <a href={hrefFor('/')} onClick={(event) => go(event, '/')} className="font-semibold text-primary hover:underline">
                  Open the docs index
                </a>
              </p>
            </>
          )}
        </main>

        <aside className="hidden w-48 shrink-0 xl:block">
          <div className="sticky top-24">
            <Toc route={route} />
          </div>
        </aside>
      </div>
    </div>
  )
}
