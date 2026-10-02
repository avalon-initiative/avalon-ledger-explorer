import { describe, expect, it, vi } from 'vitest'
import { EntriesError } from '../src/api/entries'
import { PAGE_SIZE, useShardEntries } from '../src/composables/useShardEntries'
import type { SthReport } from '../src/utils/sthReport'
import { entries } from './fixtures/entries'

const report: SthReport = { nodeUrl: 'http://node', anchorSource: 'a', verified: true, checks: [] }

function setup(pages: Array<ReturnType<typeof entries> | Error>) {
  const listEntries = vi.fn()
  for (const page of pages) listEntries.mockImplementationOnce(() => (page instanceof Error ? Promise.reject(page) : Promise.resolve(page)))
  const verifyHead = vi.fn().mockResolvedValue(report)
  return { listEntries, verifyHead, state: useShardEntries('http://node', { client: { listEntries }, verifyHead }) }
}

describe('useShardEntries', () => {
  it('loads the core shard from seq 0 and verifies its head', async () => {
    const { state, listEntries, verifyHead } = setup([entries(3)])
    await state.load()
    expect(listEntries).toHaveBeenCalledWith('http://node', { shardId: 'core', sinceSeq: 0, limit: PAGE_SIZE })
    expect(verifyHead).toHaveBeenCalledWith('http://node', 'core')
    expect(state.phase.value).toBe('done')
    expect(state.entries.value).toHaveLength(3)
    expect(state.head.value).toBe(report)
    expect(state.hasNext.value).toBe(false)
  })

  it('loads the entered shard', async () => {
    const { state, listEntries } = setup([entries(1)])
    state.shardInput.value = ' other '
    await state.load()
    expect(listEntries.mock.calls[0][1].shardId).toBe('other')
  })

  it('pages forward by the last seq and back again', async () => {
    const { state, listEntries } = setup([entries(PAGE_SIZE), entries(2, PAGE_SIZE + 1), entries(PAGE_SIZE)])
    await state.load()
    expect(state.hasNext.value).toBe(true)
    expect(state.hasPrevious.value).toBe(false)
    await state.next()
    expect(listEntries.mock.calls[1][1].sinceSeq).toBe(PAGE_SIZE)
    expect(state.hasNext.value).toBe(false)
    expect(state.hasPrevious.value).toBe(true)
    await state.previous()
    expect(listEntries.mock.calls[2][1].sinceSeq).toBe(0)
    expect(state.hasPrevious.value).toBe(false)
  })

  it('filters the loaded page by kind and resets the filter on reload', async () => {
    const { state } = setup([[...entries(2, 1, 'a'), ...entries(1, 3, 'b')], entries(1)])
    await state.load()
    expect(state.kinds.value.map((k) => k.value)).toEqual(['a', 'b'])
    state.selectedKinds.value = ['b']
    expect(state.visible.value.map((e) => e.seq)).toEqual([3])
    await state.load()
    expect(state.selectedKinds.value).toEqual([])
  })

  it('toggles payload expansion and collapses on a new page', async () => {
    const { state } = setup([entries(2)])
    await state.load()
    state.toggle(1)
    expect(state.expanded.value).toEqual([1])
    state.toggle(1)
    expect(state.expanded.value).toEqual([])
  })

  it('exposes an empty shard as an empty done page', async () => {
    const { state } = setup([[]])
    await state.load()
    expect(state.phase.value).toBe('done')
    expect(state.entries.value).toEqual([])
    expect(state.continuity.value).toEqual({ kind: 'empty' })
  })

  it('surfaces a fetch error and clears the page', async () => {
    const { state } = setup([entries(1), new EntriesError('This node does not serve shard x.', 404)])
    await state.load()
    await state.load()
    expect(state.phase.value).toBe('failed')
    expect(state.error.value).toBe('This node does not serve shard x.')
    expect(state.entries.value).toEqual([])
  })

  it('ignores a page superseded by a newer load', async () => {
    let release!: (page: ReturnType<typeof entries>) => void
    const slow = new Promise<ReturnType<typeof entries>>((resolve) => (release = resolve))
    const listEntries = vi.fn().mockReturnValueOnce(slow).mockResolvedValueOnce(entries(1, 9))
    const state = useShardEntries('http://node', { client: { listEntries }, verifyHead: vi.fn().mockResolvedValue(report) })
    const first = state.load()
    await state.load()
    release(entries(3))
    await first
    expect(state.entries.value.map((e) => e.seq)).toEqual([9])
  })
})
