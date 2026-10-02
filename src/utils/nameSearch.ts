import type { LedgerEntry } from '../api/entries'

export interface NameCandidate {
  identityId: string
  displayName: string
  seq: number
  timestamp: string
  /** Other candidates in the results with the same name, compared case-insensitively. */
  sameNameAs: number
}

/** The identity and display name an `identity.created` entry carries; null for any other entry or a payload without both. */
export function createdName(entry: LedgerEntry): { identityId: string; displayName: string } | null {
  if (entry.kind !== 'identity.created' || typeof entry.payload !== 'object' || entry.payload === null) return null
  const { identity_id: identityId, display_name: displayName } = entry.payload as Record<string, unknown>
  return typeof identityId === 'string' && typeof displayName === 'string' ? { identityId, displayName } : null
}

/** Candidates whose display name contains the query, case-insensitively. An empty query matches nothing. */
export function matchNames(entries: LedgerEntry[], query: string): Omit<NameCandidate, 'sameNameAs'>[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const found: Omit<NameCandidate, 'sameNameAs'>[] = []
  for (const entry of entries) {
    const created = createdName(entry)
    if (created?.displayName.toLowerCase().includes(needle)) found.push({ ...created, seq: entry.seq, timestamp: entry.event_timestamp })
  }
  return found
}

/** Exact name matches first, then by name and seq; each candidate counts the others sharing its name. */
export function rankCandidates(found: Omit<NameCandidate, 'sameNameAs'>[], query: string): NameCandidate[] {
  const needle = query.trim().toLowerCase()
  const counts = new Map<string, number>()
  for (const c of found) counts.set(c.displayName.toLowerCase(), (counts.get(c.displayName.toLowerCase()) ?? 0) + 1)
  return found
    .map((c) => ({ ...c, sameNameAs: (counts.get(c.displayName.toLowerCase()) ?? 1) - 1 }))
    .sort((a, b) => {
      const exact = Number(b.displayName.toLowerCase() === needle) - Number(a.displayName.toLowerCase() === needle)
      return exact || a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()) || a.seq - b.seq
    })
}
