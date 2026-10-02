import type { AvalonMultiSelectOption, AvalonStatusTone } from '@avalon-initiative/common-ui'
import type { LedgerEntry } from '../api/entries'

export type Continuity = { kind: 'empty' } | { kind: 'linked'; count: number } | { kind: 'broken'; atSeq: number; reason: 'gap' | 'prev_hash' }

/** Whether each entry follows the one before it: next seq and prev_hash equal to the previous entry_hash. */
export function chainContinuity(entries: LedgerEntry[]): Continuity {
  if (entries.length === 0) return { kind: 'empty' }
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]
    const entry = entries[i]
    if (entry.seq !== prev.seq + 1) return { kind: 'broken', atSeq: entry.seq, reason: 'gap' }
    if (entry.prev_hash !== prev.entry_hash) return { kind: 'broken', atSeq: entry.seq, reason: 'prev_hash' }
  }
  return { kind: 'linked', count: entries.length }
}

export function continuityLabel(c: Continuity): { label: string; tone: AvalonStatusTone } {
  if (c.kind === 'empty') return { label: 'No entries to link', tone: 'warning' }
  if (c.kind === 'linked') return { label: `Hash chain linked across ${c.count} entries`, tone: 'success' }
  const why = c.reason === 'gap' ? 'sequence gap' : 'prev_hash mismatch'
  return { label: `Hash chain broken at seq ${c.atSeq} (${why})`, tone: 'danger' }
}

export function kindOptions(entries: LedgerEntry[]): AvalonMultiSelectOption[] {
  return [...new Set(entries.map((e) => e.kind))].sort().map((kind) => ({ value: kind, label: kind }))
}

/** Entries whose kind is selected; no selection keeps all. */
export function filterByKind(entries: LedgerEntry[], kinds: string[]): LedgerEntry[] {
  return kinds.length === 0 ? entries : entries.filter((e) => kinds.includes(e.kind))
}

export function shortHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 12)}...` : hash
}

export function payloadText(entry: LedgerEntry): string {
  return entry.payload_pruned ? 'Payload pruned by this node.' : JSON.stringify(entry.payload, null, 2)
}
