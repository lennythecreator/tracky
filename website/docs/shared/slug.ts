/**
 * Heading text to the anchor the on-this-page list and a deep link use. The
 * authoring contract calls for one slug per page, so this stays a pure
 * lowercase-and-hyphenate step; duplicates are a build error, not a reason to
 * append a number here.
 */
export function slugify(text: string): string {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
