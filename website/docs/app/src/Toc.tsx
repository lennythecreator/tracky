import { useEffect, useState } from 'react'

interface Heading {
  id: string
  text: string
  level: number
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * The on-this-page list, built from the headings the page just rendered, so the
 * page and the list cannot disagree. Headings get their slug as an id here;
 * deeper anchors and duplicate handling arrive with the authoring contract.
 */
export function Toc({ route }: { route: string }) {
  const [headings, setHeadings] = useState<Heading[]>([])

  useEffect(() => {
    const article = document.getElementById('docs-article')
    if (!article) {
      setHeadings([])
      return
    }

    const seen = new Map<string, number>()
    const found: Heading[] = []
    for (const element of article.querySelectorAll<HTMLElement>('h2, h3')) {
      const text = element.textContent?.trim() ?? ''
      if (!text) continue
      const slug = slugify(text) || 'section'
      const count = (seen.get(slug) ?? 0) + 1
      seen.set(slug, count)
      const id = count === 1 ? slug : `${slug}-${count}`
      element.id = id
      found.push({ id, text, level: element.tagName === 'H3' ? 3 : 2 })
    }
    setHeadings(found)
  }, [route])

  if (headings.length === 0) return null

  return (
    <nav aria-labelledby="docs-toc-heading">
      <p id="docs-toc-heading" className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? 'pl-3' : undefined}>
            <a
              href={`#${heading.id}`}
              className="block border-l border-border py-1 pl-3 text-muted-foreground hover:border-primary hover:text-foreground"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
