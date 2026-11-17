import { useState } from 'react'
import { applyTheme, readTheme, storeTheme, toggleTheme, type Theme } from './theme'

/**
 * A labelled toggle for the docs colour scheme. The pressed state reports the
 * current scheme, the button keeps its name while it changes, and Tab and
 * Enter/Space operate it like any native button. It sends no event and mounts
 * no provider; the only side effects are the document attribute and the stored
 * choice.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => readTheme())

  const change = () => {
    const next = toggleTheme(theme)
    applyTheme(next)
    storeTheme(next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      className={className}
      aria-pressed={theme === 'dark'}
      onClick={change}
    >
      Dark theme
    </button>
  )
}
