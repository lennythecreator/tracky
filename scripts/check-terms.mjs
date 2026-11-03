/**
 * Fail when the docs or the website copy use a word that `CONTEXT.md` rules out.
 *
 * Each rule names the avoided phrases it enforces. The script reads the
 * `_Avoid_:` lists out of `CONTEXT.md` and checks that every phrase it polices
 * is still listed there, so the rules cannot outlive the glossary entries they
 * come from. Add a term to `CONTEXT.md` first, then add a rule here.
 *
 * Scope is developer-facing prose: the root documents, `docs/`, the registry
 * READMEs, and the website. Source comments and tests are not scanned, and
 * neither is `CONTEXT.md` itself, which has to spell the words out.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const GLOSSARY = 'CONTEXT.md'
const EXTENSIONS = new Set(['.md', '.html', '.ts', '.tsx'])
const SKIP_DIRS = new Set([
  '.agents',
  '.claude',
  '.freebuff',
  '.git',
  '.impeccable',
  '.vibe-wise',
  '.vercel',
  'dist',
  'node_modules',
  'research',
])

const RULES = [
  {
    avoid: ['empty route', 'null route', 'blank route'],
    pattern: /\b(?:empty|null|blank) route\b/i,
    preferred: 'an ignored location',
  },
  {
    avoid: ['visitor'],
    pattern: /\bvisitors?\b/i,
    preferred: 'a visit',
  },
  {
    avoid: ['rage click', 'dead click'],
    pattern: /\b(?:rage|dead) clicks?\b/i,
    preferred: 'a frustration click',
  },
  {
    avoid: ['destination'],
    pattern: /\bdestinations?\b/i,
    preferred: 'the endpoint',
  },
  {
    avoid: ['queue'],
    pattern: /\bthe queue\b/i,
    preferred: 'the buffer',
  },
  {
    avoid: ['event name'],
    pattern: /\bevent names?\b/i,
    preferred: 'the event type, or the analytics name',
  },
]

/** The glossary entries, keyed by term, with the phrases each one rejects. */
function readGlossary() {
  let source

  try {
    source = readFileSync(path.resolve(GLOSSARY), 'utf8')
  } catch {
    console.error(`terms: cannot read ${GLOSSARY}, which defines the vocabulary.`)
    process.exit(1)
  }

  const terms = new Map()
  let current = null

  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(/^\*\*(.+?)\*\*/)
    if (heading) current = heading[1].trim()

    const avoid = line.match(/^_Avoid_:\s*(.+)$/)
    if (!avoid || !current) continue

    const phrases = avoid[1]
      .split(',')
      .map((phrase) => phrase.replace(/\([^)]*\)/g, '').replace(/[`.]/g, '').trim().toLowerCase())
      .filter(Boolean)

    terms.set(current, phrases)
  }

  return terms
}

/** Every phrase the glossary rejects, mapped to the term that replaces it. */
function readAvoidedPhrases(terms) {
  const avoided = new Map()
  for (const [term, phrases] of terms) {
    for (const phrase of phrases) avoided.set(phrase, term)
  }
  return avoided
}

function collect(directory, files = [], nested = true) {
  let entries

  try {
    entries = readdirSync(path.resolve(directory), { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!nested || SKIP_DIRS.has(entry.name)) continue
      collect(path.join(directory, entry.name), files)
      continue
    }

    if (!EXTENSIONS.has(path.extname(entry.name))) continue

    const file = path.join(directory, entry.name)
    if (file === GLOSSARY) continue
    files.push(file)
  }

  return files
}

/** Prose the project publishes: the root documents, docs, registry, website. */
function files() {
  return ['docs', 'registry', 'website'].reduce((all, directory) => collect(directory, all), collect('.', [], false))
}

function check(rules, files) {
  const problems = []

  for (const rule of rules) {
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split(/\r?\n/)

      lines.forEach((line, index) => {
        if (line.includes('terms-allow')) return
        const match = line.match(rule.pattern)
        if (!match) return

        problems.push({
          file,
          line: index + 1,
          found: match[0],
          preferred: rule.preferred,
          text: line.trim(),
        })
      })
    }
  }

  return problems
}

const avoided = readAvoidedPhrases(readGlossary())
let untracked = 0

for (const rule of RULES) {
  for (const phrase of rule.avoid) {
    if (avoided.has(phrase)) continue
    untracked += 1
    console.error(`terms: ${GLOSSARY} no longer lists "${phrase}" as avoided. Update the rule or the glossary.`)
  }
}

if (untracked > 0) process.exit(1)

const targets = files()
const problems = check(RULES, targets)

if (problems.length === 0) {
  console.log(`terms: ${targets.length} files match ${GLOSSARY}.`)
  process.exit(0)
}

for (const problem of problems) {
  console.error(`${problem.file}:${problem.line}: "${problem.found}" — use ${problem.preferred}.`)
  console.error(`  ${problem.text}`)
}

console.error(`\nterms: ${problems.length} occurrence(s) the glossary rules out.`)
process.exit(1)
