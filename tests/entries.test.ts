import { describe, expect, it, vi } from 'vitest'
import { createEntriesClient, EntriesError } from '../src/api/entries'
import { prunedWire, wireEntries } from './fixtures/entries'

function respond(body: unknown, init: ResponseInit = {}) {
  return vi.fn().mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), init))
}

const query = { shardId: 'core', sinceSeq: 0, limit: 50 }

describe('entries client', () => {
  it('requests the shard, cursor and limit and parses string seqs', async () => {
    const fetchFn = respond(wireEntries(2))
    const rows = await createEntriesClient(fetchFn).listEntries('http://node:8080', { shardId: 'sh 1', sinceSeq: 7, limit: 2 })
    const url = new URL(fetchFn.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('http://node:8080/ledger/entries')
    expect(Object.fromEntries(url.searchParams)).toEqual({ shard_id: 'sh 1', since_seq: '7', limit: '2' })
    expect(rows.map((r) => r.seq)).toEqual([1, 2])
    expect(rows[0].payload).toEqual({ credential_id: 'cred-1', identity_id: 'aeffc91b-0000-4000-8000-000000000001' })
  })

  it('sends the optional subject filter', async () => {
    const fetchFn = respond([])
    await createEntriesClient(fetchFn).listEntries('http://node', { ...query, subject: 'identity:abc' })
    expect(new URL(fetchFn.mock.calls[0][0]).searchParams.get('subject')).toBe('identity:abc')
  })

  it('accepts numeric seqs and an empty page', async () => {
    const row = { ...wireEntries(1)[0], seq: 3 }
    expect((await createEntriesClient(respond([row])).listEntries('http://node', query))[0].seq).toBe(3)
    expect(await createEntriesClient(respond([])).listEntries('http://node', query)).toEqual([])
  })

  it('keeps a pruned entry with a null payload', async () => {
    const [entry] = await createEntriesClient(respond([prunedWire()])).listEntries('http://node', query)
    expect(entry.payload_pruned).toBe(true)
    expect(entry.payload).toBeNull()
  })

  it('rejects bad paging inputs before any request', async () => {
    const fetchFn = respond([])
    const client = createEntriesClient(fetchFn)
    await expect(client.listEntries('http://node', { ...query, sinceSeq: -1 })).rejects.toThrow('since_seq')
    await expect(client.listEntries('http://node', { ...query, limit: 0 })).rejects.toThrow('limit')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('reports a shard the node does not serve', async () => {
    const error = await createEntriesClient(respond('', { status: 404 })).listEntries('http://node', { ...query, shardId: 'nope' }).catch((e) => e)
    expect(error).toBeInstanceOf(EntriesError)
    expect(error.message).toBe('This node does not serve shard nope.')
  })

  it('reports an HTTP error with the node message', async () => {
    await expect(createEntriesClient(respond('bad query', { status: 400 })).listEntries('http://node', query)).rejects.toThrow('answered 400: bad query')
  })

  it('reports a network failure', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(createEntriesClient(fetchFn).listEntries('http://node', query)).rejects.toThrow('Could not reach the node: Failed to fetch')
  })

  it('rejects a body that is not a list or has malformed entries', async () => {
    await expect(createEntriesClient(respond({ entries: [] })).listEntries('http://node', query)).rejects.toThrow('list of entries')
    await expect(createEntriesClient(respond('<html>')).listEntries('http://node', query)).rejects.toThrow('JSON')
    await expect(createEntriesClient(respond([{ ...wireEntries(1)[0], seq: 'x' }])).listEntries('http://node', query)).rejects.toThrow('invalid entry seq')
    await expect(createEntriesClient(respond([{ ...wireEntries(1)[0], entry_hash: undefined }])).listEntries('http://node', query)).rejects.toThrow('entry_hash')
  })
})
