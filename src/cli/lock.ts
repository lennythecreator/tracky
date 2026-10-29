import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { asRecord, parseJsonc } from './jsonc.js'

export const LOCK_FILE = 'tracky.lock.json'

export interface LockItem {
  ref: string
  resolved: string | null
  files: string[]
}

export interface TrackyLock {
  schema: number
  registry: string
  items: Record<string, LockItem>
}

function emptyLock(): TrackyLock {
  return { schema: 1, registry: '', items: {} }
}

export async function readLock(root: string): Promise<TrackyLock> {
  let raw: string

  try {
    raw = await readFile(path.join(root, LOCK_FILE), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyLock()
    throw error
  }

  try {
    const record = asRecord(parseJsonc(raw, LOCK_FILE))
    const items: Record<string, LockItem> = {}
    const rawItems = asRecord(record?.items) ?? {}

    for (const [name, value] of Object.entries(rawItems)) {
      const item = asRecord(value)
      if (!item) continue

      items[name] = {
        ref: typeof item.ref === 'string' ? item.ref : 'main',
        resolved: typeof item.resolved === 'string' ? item.resolved : null,
        files: Array.isArray(item.files)
          ? item.files.filter((file): file is string => typeof file === 'string')
          : [],
      }
    }

    return {
      schema: 1,
      registry: typeof record?.registry === 'string' ? record.registry : '',
      items,
    }
  } catch {
    console.warn(`warning: ${LOCK_FILE} could not be read; rewriting it.`)
    return emptyLock()
  }
}

export async function writeLock(root: string, lock: TrackyLock): Promise<void> {
  const items: Record<string, LockItem> = {}

  for (const name of Object.keys(lock.items).sort()) {
    items[name] = lock.items[name]
  }

  const content = `${JSON.stringify({ schema: 1, registry: lock.registry, items }, null, 2)}\n`
  await writeFile(path.join(root, LOCK_FILE), content, 'utf8')
}
