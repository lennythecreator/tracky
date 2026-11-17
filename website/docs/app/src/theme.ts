/**
 * The docs colour scheme. The palette is the registry theme plus one dark
 * override block that uses the same `--tracky-*` names, so components and code
 * surfaces follow the scheme without a second set of classes.
 *
 * Nothing here touches browser APIs at module load: the app shell and the
 * pre-paint script in `app/index.html` call these functions.
 */

export type Theme = 'light' | 'dark'

/** Where the reader's explicit choice is kept. */
export const THEME_KEY = 'tracky-docs-theme'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** The system preference, for a first visit with no stored choice. */
export function preferredTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * A stored choice wins; a missing, unreadable, or invalid value leaves the
 * system preference in charge. Storage can throw (private mode, blocked
 * cookies), so the read is guarded.
 */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (isTheme(stored)) return stored
  return prefersDark ? 'dark' : 'light'
}

export function readStoredTheme(storage?: Pick<Storage, 'getItem'>): Theme | null {
  try {
    const source = storage ?? window.localStorage
    const value = source.getItem(THEME_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

/** Persist the choice; a refused write leaves the in-session theme alone. */
export function storeTheme(theme: Theme, storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    const target = storage ?? window.localStorage
    target.setItem(THEME_KEY, theme)
    return true
  } catch {
    return false
  }
}

/** The scheme to render now: the document attribute, then storage, then the system. */
export function readTheme(): Theme {
  if (typeof document !== 'undefined' && isTheme(document.documentElement.dataset.theme)) {
    return document.documentElement.dataset.theme
  }
  return readStoredTheme() ?? preferredTheme()
}

/** Apply a scheme without waiting for a render, so a toggle repaints at once. */
export function applyTheme(theme: Theme, root?: HTMLElement): void {
  const target = root ?? (typeof document === 'undefined' ? undefined : document.documentElement)
  if (target) target.dataset.theme = theme
}

export function toggleTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}
