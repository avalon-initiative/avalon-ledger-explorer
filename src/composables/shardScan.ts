import type { EntriesClient, LedgerEntry } from '../api/entries'

export const SCAN_PAGE_SIZE = 1000
/** Pages scanned per run; a longer shard needs the scan continued. */
export const MAX_SCAN_PAGES = 20

export interface ScanOptions {
  nodeUrl: string
  shardId: string
  fromSeq: number
  /** True once a newer run superseded this one; the scan stops without reporting. */
  isStale: () => boolean
  onRows: (rows: LedgerEntry[]) => void
}

/** Reads a shard's pages in order from `fromSeq`, up to the page cap. */
export async function scanShard(client: EntriesClient, opts: ScanOptions): Promise<{ lastSeq: number; reachedEnd: boolean }> {
  let since = opts.fromSeq
  for (let page = 0; page < MAX_SCAN_PAGES; page++) {
    const rows = await client.listEntries(opts.nodeUrl, { shardId: opts.shardId, sinceSeq: since, limit: SCAN_PAGE_SIZE })
    if (opts.isStale()) return { lastSeq: since, reachedEnd: false }
    opts.onRows(rows)
    if (rows.length > 0) since = rows[rows.length - 1].seq
    if (rows.length < SCAN_PAGE_SIZE) return { lastSeq: since, reachedEnd: true }
  }
  return { lastSeq: since, reachedEnd: false }
}
