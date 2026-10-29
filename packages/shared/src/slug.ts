const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A lowercase, hyphenated slug suggested from a program title. */
export function suggestSlug(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2018\u2019`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}
