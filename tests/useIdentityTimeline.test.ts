import { describe, expect, it, vi } from 'vitest'
import { EntriesError } from '../src/api/entries'
import type { LedgerEntry } from '../src/api/entries'
import { MAX_SCAN_PAGES, SCAN_PAGE_SIZE, useIdentityTimeline } from '../src/composables/useIdentityTimeline'
import { entries } from './fixtures/entries'

const ID = 'aeffc91b-0000-4000-8000-000000000001'

function setup(pages: Array<LedgerEntry[] | Error>) {
  const listEntries = vi.fn()
  for (const page of pages) listEntries.mockImplementationOnce(() => (page instanceof Error ? Promise.reject(page) : Promise.resolve(page)))
  const state = useIdentityTimeline('http://node', { listEntries })
  state.identityInput.value = `identity:${ID}`
  return { listEntries, state }
}

const other = (count: number, start: number): LedgerEntry[] => entries(count, start).map((e) => ({ ...e, subject: 'guild:g1', payload: {} }))

describe('useIdentityTimeline', () => {
  it('scans to the end and keeps only entries naming the identity', async () => {
    const { state, listEntries } = setup([[...entries(2), ...other(2, 3)]])
    await state.search()
    expect(listEntries).toHaveBeenCalledWith('http://node', { shardId: 'core', sinceSeq: 0, limit: SCAN_PAGE_SIZE })
    expect(state.phase.value).toBe('done')
    expect(state.matches.value.map((e) => e.seq)).toEqual([1, 2])
    expect(state.scanned.value).toBe(4)
    expect(state.reachedEnd.value).toBe(true)
  })

  it('refuses an input that is not an identity id without asking the node', async () => {
    const { state, listEntries } = setup([])
    state.identityInput.value = 'alice'
    await state.search()
    expect(state.phase.value).toBe('failed')
    expect(listEntries).not.toHaveBeenCalled()
  })

  it('stops at the page cap and continues from the last seq', async () => {
    const full = (start: number) => other(SCAN_PAGE_SIZE, start)
    const pages = Array.from({ length: MAX_SCAN_PAGES }, (_, i) => full(1 + i * SCAN_PAGE_SIZE))
    const { state, listEntries } = setup([...pages, entries(1, MAX_SCAN_PAGES * SCAN_PAGE_SIZE + 1)])
    await state.search()
    expect(state.reachedEnd.value).toBe(false)
    expect(listEntries).toHaveBeenCalledTimes(MAX_SCAN_PAGES)
    await state.continueScan()
    expect(listEntries.mock.calls[MAX_SCAN_PAGES][1].sinceSeq).toBe(MAX_SCAN_PAGES * SCAN_PAGE_SIZE)
    expect(state.reachedEnd.value).toBe(true)
    expect(state.matches.value).toHaveLength(1)
  })

  it('reports a node failure', async () => {
    const { state } = setup([new EntriesError('boom')])
    await state.search()
    expect(state.phase.value).toBe('failed')
    expect(state.error.value).toBe('boom')
  })

  it('drops the results of a scan superseded by a newer one', async () => {
    let release: (rows: LedgerEntry[]) => void = () => undefined
    const listEntries = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (release = resolve)))
      .mockResolvedValueOnce(entries(1))
    const state = useIdentityTimeline('http://node', { listEntries })
    state.identityInput.value = ID
    const first = state.search()
    await state.search()
    release(entries(5))
    await first
    expect(state.matches.value).toHaveLength(1)
  })
})
