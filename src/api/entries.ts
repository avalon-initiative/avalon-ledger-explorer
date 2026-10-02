/** One ledger entry as `GET /ledger/entries` serves it; `seq` is normalized to a number. */
export interface LedgerEntry {
  seq: number
  event_id: string
  kind: string
  issuer: string
  subject: string
  /** Null when the node pruned this entry's payload. */
  payload: unknown
  payload_pruned: boolean
  version: string
  event_timestamp: string
  prev_hash: string
  entry_hash: string
  batch_id: string
}

export interface EntriesQuery {
  shardId: string
  /** Entries strictly after this sequence number; at least 0. */
  sinceSeq: number
  /** Page size, above 0; the node caps it (1000 today). */
  limit: number
  /** Only one subject's entries, e.g. `identity:<uuid>`. */
  subject?: string
}

/** Read-only entry listing; the one seam to swap for an SDK client once it has one. */
export interface EntriesClient {
  listEntries(nodeUrl: string, query: EntriesQuery, signal?: AbortSignal): Promise<LedgerEntry[]>
}

export class EntriesError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'EntriesError'
    this.status = status
  }
}

const TEXT_FIELDS = ['event_id', 'kind', 'issuer', 'subject', 'event_timestamp', 'prev_hash', 'entry_hash', 'batch_id'] as const

function parseSeq(raw: unknown): number {
  const seq = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 0) throw new EntriesError(`The node sent an invalid entry seq: ${String(raw)}`)
  return seq
}

function parseEntry(raw: unknown): LedgerEntry {
  if (typeof raw !== 'object' || raw === null) throw new EntriesError('The node sent an entry that is not an object.')
  const row = raw as Record<string, unknown>
  for (const field of TEXT_FIELDS) {
    if (typeof row[field] !== 'string') throw new EntriesError(`The node sent an entry without a ${field}.`)
  }
  const pruned = row.payload_pruned === true
  return {
    seq: parseSeq(row.seq),
    event_id: row.event_id as string,
    kind: row.kind as string,
    issuer: row.issuer as string,
    subject: row.subject as string,
    payload: pruned ? null : (row.payload ?? null),
    payload_pruned: pruned,
    version: String(row.version),
    event_timestamp: row.event_timestamp as string,
    prev_hash: row.prev_hash as string,
    entry_hash: row.entry_hash as string,
    batch_id: row.batch_id as string,
  }
}

export function createEntriesClient(fetchFn: typeof fetch = (...args) => fetch(...args)): EntriesClient {
  return {
    async listEntries(nodeUrl, query, signal) {
      if (!Number.isInteger(query.sinceSeq) || query.sinceSeq < 0) throw new EntriesError('since_seq must be a whole number, 0 or more.')
      if (!Number.isInteger(query.limit) || query.limit <= 0) throw new EntriesError('limit must be a whole number above 0.')
      const params = new URLSearchParams({ shard_id: query.shardId, since_seq: String(query.sinceSeq), limit: String(query.limit) })
      if (query.subject) params.set('subject', query.subject)
      let response: Response
      try {
        response = await fetchFn(`${nodeUrl}/ledger/entries?${params}`, { headers: { accept: 'application/json' }, signal })
      } catch (err) {
        if (signal?.aborted) throw err
        throw new EntriesError(`Could not reach the node: ${err instanceof Error ? err.message : String(err)}`)
      }
      if (response.status === 404) throw new EntriesError(`This node does not serve shard ${query.shardId}.`, 404)
      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).trim().slice(0, 200)
        throw new EntriesError(`The node answered ${response.status}${detail ? `: ${detail}` : ''}`, response.status)
      }
      let body: unknown
      try {
        body = await response.json()
      } catch {
        throw new EntriesError('The node did not answer with JSON.', response.status)
      }
      if (!Array.isArray(body)) throw new EntriesError('The node did not answer with a list of entries.', response.status)
      return body.map(parseEntry)
    },
  }
}

export const entriesClient: EntriesClient = createEntriesClient()
