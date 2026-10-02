import { describe, expect, it, vi } from 'vitest'
import { EntriesError } from '../src/api/entries'
import { MAX_SCAN_PAGES, SCAN_PAGE_SIZE } from '../src/composables/shardScan'
import { useNameSearch } from '../src/composables/useNameSearch'
import { createdEntry, entries } from './fixtures/entries'

describe('useNameSearch', () => {
  it('collects matches across pages and reports the end', async () => {
    const page1 = [createdEntry(1, 'a', 'Alice'), ...entries(SCAN_PAGE_SIZE - 1, 2)]
    const listEntries = vi.fn().mockResolvedValueOnce(page1).mockResolvedValueOnce([createdEntry(SCAN_PAGE_SIZE + 1, 'b', 'alice')])
    const state = useNameSearch('http://node', { listEntries })
    state.queryInput.value = 'ALICE'
    await state.search()
    expect(listEntries.mock.calls[1][1].sinceSeq).toBe(SCAN_PAGE_SIZE)
    expect(state.candidates.value.map((c) => c.identityId).sort()).toEqual(['a', 'b'])
    expect(state.scanned.value).toBe(SCAN_PAGE_SIZE + 1)
    expect(state.reachedEnd.value).toBe(true)
  })

  it('stops at the page cap and can continue', async () => {
    const full = (start: number) => entries(SCAN_PAGE_SIZE, start)
    const listEntries = vi.fn()
    for (let i = 0; i < MAX_SCAN_PAGES; i++) listEntries.mockResolvedValueOnce(full(1 + i * SCAN_PAGE_SIZE))
    listEntries.mockResolvedValueOnce([])
    const state = useNameSearch('http://node', { listEntries })
    state.queryInput.value = 'x'
    await state.search()
    expect(state.reachedEnd.value).toBe(false)
    await state.continueScan()
    expect(state.reachedEnd.value).toBe(true)
  })

  it('reports a failure', async () => {
    const state = useNameSearch('http://node', { listEntries: vi.fn().mockRejectedValue(new EntriesError('down')) })
    state.queryInput.value = 'x'
    await state.search()
    expect(state.phase.value).toBe('failed')
    expect(state.error.value).toBe('down')
  })
})
