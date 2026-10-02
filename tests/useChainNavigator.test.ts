import { describe, expect, it, vi } from 'vitest'
import type { LedgerEntry } from '../src/api/entries'
import { useChainNavigator } from '../src/composables/useChainNavigator'
import type { SthReport } from '../src/utils/sthReport'
import { entries } from './fixtures/entries'
import { head } from './fixtures/heads'

const report = (size: number): SthReport => ({ nodeUrl: 'http://node', anchorSource: 'a', verified: true, checks: [], head: head({ tree_size: size }) })

/** A ledger of `size` linked entries; listEntries answers like the node does (strictly after since_seq). */
function setup(size: number) {
  const all = entries(size)
  const listEntries = vi.fn(async (_url: string, q: { sinceSeq: number; limit: number }): Promise<LedgerEntry[]> => all.filter((e) => e.seq > q.sinceSeq).slice(0, q.limit))
  const verifyHead = vi.fn().mockResolvedValue(report(size))
  return { listEntries, verifyHead, state: useChainNavigator('http://node', { client: { listEntries }, verifyHead }) }
}

describe('useChainNavigator', () => {
  it('opens at the last entry with its previous neighbour and checks the link', async () => {
    const { state, listEntries } = setup(10)
    await state.open()
    expect(listEntries.mock.calls[0][1]).toMatchObject({ shardId: 'core', sinceSeq: 8, limit: 3 })
    expect(state.phase.value).toBe('ready')
    expect([state.window.value.prev?.seq, state.window.value.current?.seq, state.window.value.next]).toEqual([9, 10, null])
    expect(state.before.value).toBe('linked')
    expect(state.after.value).toBe('none')
    expect(state.canStep.value).toEqual({ back: true, forward: false })
  })

  it('steps both ways and jumps by seq', async () => {
    const { state } = setup(10)
    await state.open()
    await state.step(-1)
    expect(state.seq.value).toBe(9)
    expect(state.window.value.next?.seq).toBe(10)
    await state.goTo(1)
    expect([state.window.value.prev, state.window.value.current?.seq, state.window.value.next?.seq]).toEqual([null, 1, 2])
    expect(state.canStep.value.back).toBe(false)
  })

  it('opens at a given seq and reads it from the input', async () => {
    const { state } = setup(10)
    await state.open(4)
    expect(state.seq.value).toBe(4)
    state.seqInput.value = ' 7 '
    await state.goToInput()
    expect(state.seq.value).toBe(7)
  })

  it('flags a broken link to a neighbour', async () => {
    const all = entries(3)
    all[2] = { ...all[2], prev_hash: 'ff'.repeat(32) }
    const listEntries = vi.fn().mockResolvedValue(all)
    const state = useChainNavigator('http://node', { client: { listEntries }, verifyHead: vi.fn().mockResolvedValue(report(3)) })
    await state.open()
    expect(state.before.value).toBe('broken')
  })

  it('keeps the shown entry and reports a seq the node does not have', async () => {
    const { state } = setup(3)
    await state.open()
    await state.goTo(50)
    expect(state.phase.value).toBe('failed')
    expect(state.error.value).toContain('No entry at seq 50')
    expect(state.window.value.current?.seq).toBe(3)
  })

  it('rejects a bad seq without asking the node', async () => {
    const { state, listEntries } = setup(3)
    await state.open()
    listEntries.mockClear()
    await state.goTo(0)
    expect(state.phase.value).toBe('failed')
    expect(listEntries).not.toHaveBeenCalled()
  })

  it('fails on a shard with no head', async () => {
    const listEntries = vi.fn()
    const state = useChainNavigator('http://node', { client: { listEntries }, verifyHead: vi.fn().mockResolvedValue({ nodeUrl: 'u', anchorSource: 'a', verified: false, checks: [], error: 'unreachable' }) })
    await state.open()
    expect(state.phase.value).toBe('failed')
    expect(state.error.value).toBe('unreachable')
  })
})
