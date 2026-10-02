import type { LedgerEntry } from '../../src/api/entries'

const IDENTITY = 'identity:aeffc91b-0000-4000-8000-000000000001'
const GENESIS = '00'.repeat(32)

/** Entries as the node serves them: `seq` and `version` are strings. */
export function wireEntries(count: number, start = 1, kind = 'identity.passkey_registered'): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (let i = 0; i < count; i++) {
    const seq = start + i
    rows.push({
      seq: String(seq),
      event_id: `ee58a163-0000-4000-8000-${String(seq).padStart(12, '0')}`,
      kind,
      issuer: `${IDENTITY}:self:passkey_registered`,
      subject: `${IDENTITY}:self:passkey_registered`,
      payload: { credential_id: `cred-${seq}`, identity_id: 'aeffc91b-0000-4000-8000-000000000001' },
      payload_pruned: false,
      version: '1',
      event_timestamp: '2026-09-28T12:49:12.000828Z',
      prev_hash: seq === 1 ? GENESIS : hash(seq - 1),
      entry_hash: hash(seq),
      batch_id: '1f25aaaa-0000-4000-8000-000000000001',
    })
  }
  return rows
}

export function hash(seq: number): string {
  return seq.toString(16).padStart(2, '0').repeat(32)
}

export function entries(count: number, start = 1, kind?: string): LedgerEntry[] {
  return wireEntries(count, start, kind).map((row) => ({ ...(row as unknown as LedgerEntry), seq: Number(row.seq), version: String(row.version) }))
}

export function prunedWire(): Record<string, unknown> {
  return { ...wireEntries(1, 5)[0], payload: null, payload_pruned: true }
}
