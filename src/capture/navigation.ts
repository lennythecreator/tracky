/**
 * One shared observer for History API navigation. The first subscriber wraps
 * `pushState` and `replaceState`; the last one to leave removes the wrappers.
 */

const listeners = new Set<() => void>()
let uninstall: (() => void) | undefined

function notify() {
  for (const listener of [...listeners]) listener()
}

function install(): () => void {
  // Another script may wrap the History API after this one. On uninstall, only
  // restore the originals if these wrappers are still installed; otherwise
  // leave the chain intact and let `active` make these wrappers inert.
  let active = true
  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState
  const pushState: History['pushState'] = function (this: History, ...args) {
    originalPushState.apply(this, args)
    if (active) notify()
  }
  const replaceState: History['replaceState'] = function (this: History, ...args) {
    originalReplaceState.apply(this, args)
    if (active) notify()
  }
  history.pushState = pushState
  history.replaceState = replaceState
  window.addEventListener('popstate', notify)

  return () => {
    active = false
    window.removeEventListener('popstate', notify)
    if (history.pushState === pushState) history.pushState = originalPushState
    if (history.replaceState === replaceState) history.replaceState = originalReplaceState
  }
}

function onHistoryChange(listener: () => void): () => void {
  listeners.add(listener)
  uninstall ??= install()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      uninstall?.()
      uninstall = undefined
    }
  }
}

/**
 * Call `onChange` when the resolved route changes. The check runs one task
 * after a history change, so the router can render the new page first and a
 * redirect within one task counts once. A `null` route is ignored.
 */
export function subscribeToRoute(
  resolve: () => string | null,
  onChange: (route: string, previous: string | null) => void,
): () => void {
  let last = resolve()
  let pending: ReturnType<typeof setTimeout> | undefined

  const check = () => {
    pending = undefined
    const route = resolve()
    if (route === null || route === last) return
    const previous = last
    last = route
    onChange(route, previous)
  }

  const unsubscribe = onHistoryChange(() => { pending ??= setTimeout(check, 0) })
  return () => {
    if (pending) clearTimeout(pending)
    unsubscribe()
  }
}
