import type { LedgerEntry } from '../api/entries'

export type LinkState = 'linked' | 'broken' | 'none'

/** Whether `next` points at `prev`: the two are consecutive and next.prev_hash equals prev.entry_hash. `none` when either is missing. */
export function linkBetween(prev: LedgerEntry | null, next: LedgerEntry | null): LinkState {
  if (!prev || !next) return 'none'
  return next.seq === prev.seq + 1 && next.prev_hash === prev.entry_hash ? 'linked' : 'broken'
}

export function linkLabel(state: LinkState): string {
  if (state === 'linked') return 'Linked: prev_hash matches'
  if (state === 'broken') return 'Broken: prev_hash does not match'
  return 'No neighbour on this side'
}

export interface ChainWindow {
  prev: LedgerEntry | null
  current: LedgerEntry | null
  next: LedgerEntry | null
}

/** Picks the entry at `seq` and its neighbours out of a few consecutive entries. */
export function pickWindow(rows: LedgerEntry[], seq: number): ChainWindow {
  return {
    prev: rows.find((e) => e.seq === seq - 1) ?? null,
    current: rows.find((e) => e.seq === seq) ?? null,
    next: rows.find((e) => e.seq === seq + 1) ?? null,
  }
}
