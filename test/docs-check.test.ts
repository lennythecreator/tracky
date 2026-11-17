import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkDocs } from '../website/docs/shared/check.js'

const PAGE = (body: string, frontmatter = 'title: Page\ndescription: A page.') => `---\n${frontmatter}\n---\n\n${body}\n`

/** Write a content tree in a temp folder and run the checker over it. */
async function check(files: Record<string, string>) {
  const root = await mkdtemp(path.join(tmpdir(), 'tracky-docs-'))
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(root, 'content', name)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, body)
  }
  return checkDocs(path.join(root, 'content'), root)
}

const META = JSON.stringify({ label: 'Docs', pages: ['index'] })

describe('docs authoring contract', () => {
  it('accepts a page that follows the contract', async () => {
    const problems = await check({ 'meta.json': META, 'index.mdx': PAGE('## Install\n\n`npm install tracky`\n') })

    expect(problems).toEqual([])
  })

  it('names the line of a missing title', async () => {
    const problems = await check({ 'meta.json': META, 'index.mdx': PAGE('## One\n', 'description: A page.') })

    expect(problems).toContainEqual({
      file: 'content/index.mdx',
      line: 1,
      message: 'frontmatter is missing a title.',
    })
  })

  it('rejects a status that is not in the contract', async () => {
    const problems = await check({
      'meta.json': META,
      'index.mdx': PAGE('## One\n', 'title: Page\ndescription: A page.\nstatus: draft'),
    })

    expect(problems.map((problem) => problem.message)).toContain('status "draft" is not one of stable, beta, unreleased.')
  })

  it('rejects a heading whose anchor is already used, with both lines', async () => {
    const problems = await check({ 'meta.json': META, 'index.mdx': PAGE('## Install\n\ntext\n\n## Install\n') })

    expect(problems).toContainEqual({
      file: 'content/index.mdx',
      line: 10,
      message: 'heading "Install" repeats the anchor #install first used on line 6; add a distinguishing word.',
    })
  })

  it('rejects a link to a page that is not authored', async () => {
    const problems = await check({ 'meta.json': META, 'index.mdx': PAGE('## One\n\nSee [the guide](/guides/missing).\n') })

    expect(problems).toContainEqual({
      file: 'content/index.mdx',
      line: 8,
      message: 'no page is authored at /guides/missing.',
    })
  })

  it('rejects a link to an anchor the target page does not have', async () => {
    const problems = await check({
      'meta.json': JSON.stringify({ label: 'Docs', pages: ['index'] }),
      'index.mdx': PAGE('## One\n\nRead [the start](#two).\n'),
    })

    expect(problems.map((problem) => problem.message)).toContain('no heading "two" on /.')
  })

  it('resolves a link to a heading on another page', async () => {
    const problems = await check({
      'meta.json': JSON.stringify({ label: 'Docs', pages: ['index'] }),
      'index.mdx': PAGE('## One\n\nRead [the guide](/guides/capture#switches).\n'),
      'guides/meta.json': JSON.stringify({ label: 'Guides', pages: ['capture'] }),
      'guides/capture.mdx': PAGE('## Switches\n'),
    })

    expect(problems).toEqual([])
  })

  it('names a page that is missing from its meta file', async () => {
    const problems = await check({
      'meta.json': META,
      'index.mdx': PAGE('## One\n'),
      'extra.mdx': PAGE('## Two\n'),
    })

    expect(problems.map((problem) => problem.message)).toContain('content/extra.mdx is not listed in content/meta.json.')
  })

  it('names a listed page that has no file', async () => {
    const problems = await check({ 'meta.json': JSON.stringify({ label: 'Docs', pages: ['index', 'missing'] }), 'index.mdx': PAGE('## One\n') })

    expect(problems.map((problem) => problem.message)).toContain('content/meta.json lists "missing", but content/missing.mdx does not exist.')
  })

  it('rejects a page that lists an unknown frontmatter field', async () => {
    const problems = await check({
      'meta.json': META,
      'index.mdx': PAGE('## One\n', 'title: Page\ndescription: A page.\nfoo: bar'),
    })

    expect(problems).toContainEqual({
      file: 'content/index.mdx',
      line: 4,
      message: '"foo" is not part of the frontmatter contract.',
    })
  })

  it('ignores links and headings inside fenced examples', async () => {
    const problems = await check({
      'meta.json': META,
      'index.mdx': PAGE('## One\n\n```md\n## Install\n\n[x](/nowhere)\n```\n'),
    })

    expect(problems).toEqual([])
  })
})
