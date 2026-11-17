/**
 * Where a tablist key goes. Arrow keys wrap, Home and End jump to the ends, and
 * any other key leaves the selection alone so typing or Tab is untouched.
 * Returning the current index means "no move", which the component uses to skip
 * a preventDefault that would otherwise swallow the key.
 */
export function tabIndexForKey(key: string, index: number, count: number): number {
  if (count < 1) return 0

  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count
    case 'ArrowLeft':
      return (index - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return index
  }
}
