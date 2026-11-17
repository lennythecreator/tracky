import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const CONTENT = 'website/docs/app/src/content/components'
const EXAMPLES = 'website/docs/app/examples'

interface RegistryItem {
  name: string
  type: string
  files: { path: string }[]
}

const registry = JSON.parse(readFileSync('registry/registry.json', 'utf8')) as { items: RegistryItem[] }
const components = registry.items.filter((item) => item.type === 'ui')
const meta = JSON.parse(readFileSync(path.join(CONTENT, 'meta.json'), 'utf8')) as { pages: string[] }

const ACTIONS: Record<string, string> = {
  button: 'activate',
  checkbox: 'toggle',
  switch: 'toggle',
  select: 'change',
}

describe('component documentation', () => {
  it('has a page for every registry component, in registry order', () => {
    const pages = meta.pages.filter((page) => page !== 'index')

    expect(pages).toEqual(components.map((item) => item.name))
  })

  it('installs, demos, and links the source on every page', () => {
    for (const item of components) {
      const page = readFileSync(path.join(CONTENT, `${item.name}.mdx`), 'utf8')

      expect(page, item.name).toContain(`npx tracky add ${item.name}`)
      expect(page, item.name).toContain(`<Example name="${item.name}"`)
      expect(page, item.name).toContain(`<PropsTable`)
      expect(page, item.name).toContain(
        `https://github.com/lennythecreator/tracky/blob/main/${item.files[0]!.path}`,
      )
      expect(existsSync(path.join(EXAMPLES, `${item.name}.tsx`)), item.name).toBe(true)
    }
  })

  it('names the exact action on sending primitives', () => {
    for (const [name, action] of Object.entries(ACTIONS)) {
      const page = readFileSync(path.join(CONTENT, `${name}.mdx`), 'utf8')

      expect(page).toContain(`\`${name} · ${action}\``)
      expect(page).toMatch(/never read or sent|never travel/i)
    }
  })

  it('says explicitly that silent primitives send nothing', () => {
    for (const name of ['input', 'textarea', 'label']) {
      const page = readFileSync(path.join(CONTENT, `${name}.mdx`), 'utf8')

      expect(page).toContain('sends no component event')
      expect(page).toContain('does not render `data-tracky-component`')
    }
  })

  it('explains the shared analytics contract once, with every component linked', () => {
    const page = readFileSync(path.join(CONTENT, 'index.mdx'), 'utf8')

    for (const item of components) {
      expect(page, item.name).toContain(`](/components/${item.name})`)
    }
    expect(page).toContain('`analyticsName`')
    expect(page).toContain('`data-tracky-component`')
    expect(page).toContain('### Without a provider')
  })
})
