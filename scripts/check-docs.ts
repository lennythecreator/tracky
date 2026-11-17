/**
 * `npm run check:docs` — validate the docs content tree without a browser, a
 * network call, or a build. Exits non-zero on the first run of problems, so CI
 * reports the file, line, and reason instead of a broken page in production.
 *
 * Runs on Node's built-in type stripping: no build step and no test runner, so
 * the command stays useful on its own.
 */
import { fileURLToPath } from 'node:url'
import { checkDocs, countPages } from '../website/docs/shared/check.ts'

const contentDir = fileURLToPath(new URL('../website/docs/app/src/content/', import.meta.url))
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

const problems = checkDocs(contentDir, repoRoot)

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`${problem.file}:${problem.line}: ${problem.message}`)
  }
  console.error(`\ndocs: ${problems.length} problem${problems.length === 1 ? '' : 's'}.`)
  process.exit(1)
}

const pages = countPages(contentDir)
console.log(`docs: ${pages} page${pages === 1 ? '' : 's'} pass the frontmatter, anchor, and link contract.`)
