import { describe, expect, it, vi } from 'vitest'
import type { LedgerEntry } from '../src/api/entries'
import { BACKLOG, useLiveFeed } from '../src/composables/useLiveFeed'
import type { SthReport } from '../src/utils/sthReport'
import { head } from './fixtures/heads'
import { createdEntry, entries } from './fixtures/entries'

const report = (size: number): SthReport => ({ nodeUrl: 'http://node', anchorSource: 'a', verified: true, checks: [], head: head({ tree_size: size }) })

function setup(size: number, pages: Array<LedgerEntry[] | Error>) {
  const listEntries = vi.fn()
  for (const page of pages) listEntries.mockImplementationOnce(() => (page instanceof Error ? Promise.reject(page) : Promise.resolve(page)))
  listEntries.mockResolvedValue([])
  const verifyHead = vi.fn().mockResolvedValue(report(size))
  const timer = { tick: () => undefined as unknown, stopped: false }
  const every = vi.fn((fn: () => void) => {
    timer.tick = fn
    return () => {
      timer.stopped = true
    }
  })
  return { listEntries, verifyHead, timer, every, state: useLiveFeed('http://node', { client: { listEntries }, verifyHead, every }) }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('useLiveFeed', () => {
  it('opens at the last entries before the head and shows newest first', async () => {
    const { state, listEntries } = setup(100, [entries(3, 76)])
    await state.start()
    expect(listEntries.mock.calls[0][1]).toMatchObject({ shardId: 'core', sinceSeq: 100 - BACKLOG })
    expect(state.phase.value).toBe('running')
    expect(state.feed.value.map((e) => e.seq)).toEqual([78, 77, 76])
  })

  it('polls from the last seq and re-verifies the head when entries arrive', async () => {
    const { state, listEntries, verifyHead, timer } = setup(10, [entries(2, 9), entries(1, 11)])
    await state.start()
    expect(verifyHead).toHaveBeenCalledTimes(2)
    timer.tick()
    await flush()
    expect(listEntries.mock.calls[1][1].sinceSeq).toBe(10)
    expect(state.feed.value.map((e) => e.seq)).toEqual([11, 10, 9])
    expect(verifyHead).toHaveBeenCalledTimes(3)
    timer.tick()
    await flush()
    expect(verifyHead).toHaveBeenCalledTimes(3)
  })

  it('flags entries that do not extend the previous one', async () => {
    const gap = entries(1, 12)
    const { state, timer } = setup(10, [entries(2, 9), gap])
    await state.start()
    expect(state.broken.value).toBeNull()
    timer.tick()
    await flush()
    expect(state.broken.value).toEqual({ atSeq: 12 })
  })

  it('pauses without losing entries and resumes from the last seq', async () => {
    const { state, listEntries, timer } = setup(10, [entries(1, 10), entries(2, 11)])
    await state.start()
    state.pause()
    expect(state.phase.value).toBe('paused')
    expect(timer.stopped).toBe(true)
    await state.resume()
    expect(listEntries.mock.calls[1][1].sinceSeq).toBe(10)
    expect(state.feed.value.map((e) => e.seq)).toEqual([12, 11, 10])
    expect(state.phase.value).toBe('running')
  })

  it('filters by kind and follows one identity', async () => {
    const id = 'aeffc91b-0000-4000-8000-000000000001'
    const other = { ...entries(1, 11, 'guild.created')[0], subject: 'guild:g', payload: {} }
    const { state } = setup(10, [[...entries(1, 10), other, { ...createdEntry(12, 'zzz', 'X'), subject: 'identity:zzz' }]])
    await state.start()
    state.selectedKinds.value = ['guild.created']
    expect(state.visible.value.map((e) => e.seq)).toEqual([11])
    state.selectedKinds.value = []
    state.followInput.value = `identity:${id}`
    expect(state.visible.value.map((e) => e.seq)).toEqual([10])
    state.followInput.value = 'junk'
    expect(state.followInvalid.value).toBe(true)
    expect(state.visible.value).toHaveLength(3)
  })

  it('fails when the head cannot be read, and when polling fails', async () => {
    const down = setup(10, [])
    down.verifyHead.mockResolvedValue({ nodeUrl: 'http://node', anchorSource: 'a', verified: false, checks: [], error: 'unreachable' })
    await down.state.start()
    expect(down.state.phase.value).toBe('failed')
    expect(down.state.error.value).toBe('unreachable')

    const bad = setup(10, [entries(1, 10), new Error('gone')])
    await bad.state.start()
    bad.timer.tick()
    await flush()
    expect(bad.state.phase.value).toBe('failed')
    expect(bad.state.error.value).toBe('gone')
    expect(bad.timer.stopped).toBe(true)
  })

  it('stop halts polling', async () => {
    const { state, timer } = setup(10, [entries(1, 10)])
    await state.start()
    state.stop()
    expect(timer.stopped).toBe(true)
  })
})
