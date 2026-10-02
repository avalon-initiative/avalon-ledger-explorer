import type { LedgerEntry } from '../api/entries'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** The bare identity uuid from `<uuid>` or `identity:<uuid>`, lower-cased; null when it is neither. */
export function parseIdentityId(input: string): string | null {
  const raw = input.trim().toLowerCase().replace(/^identity:/, '')
  return UUID.test(raw) ? raw : null
}

/** Whether the entry's subject is the identity or one of its compound subjects, or its payload carries the id. */
export function namesIdentity(entry: LedgerEntry, identityId: string): boolean {
  const subject = entry.subject.toLowerCase()
  const ref = `identity:${identityId}`
  if (subject === ref || subject.startsWith(`${ref}:`)) return true
  return entry.payload !== null && JSON.stringify(entry.payload).toLowerCase().includes(identityId)
}

/** Entries grouped by kind, groups ordered by kind name and entries by seq. */
export function groupByKind(entries: LedgerEntry[]): Array<{ kind: string; entries: LedgerEntry[] }> {
  const groups = new Map<string, LedgerEntry[]>()
  for (const entry of entries) groups.set(entry.kind, [...(groups.get(entry.kind) ?? []), entry])
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([kind, list]) => ({ kind, entries: [...list].sort((a, b) => a.seq - b.seq) }))
}
