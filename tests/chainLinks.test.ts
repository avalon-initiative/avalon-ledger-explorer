import { describe, expect, it } from 'vitest'
import { linkBetween, pickWindow } from '../src/utils/chainLinks'
import { entries } from './fixtures/entries'

describe('linkBetween', () => {
  const [a, b, c] = entries(3)
  it('is linked for consecutive entries whose hashes chain', () => {
    expect(linkBetween(a, b)).toBe('linked')
  })
  it('is broken on a seq gap or a prev_hash mismatch', () => {
    expect(linkBetween(a, c)).toBe('broken')
    expect(linkBetween(a, { ...b, prev_hash: 'ff'.repeat(32) })).toBe('broken')
  })
  it('is none without a neighbour', () => {
    expect(linkBetween(null, a)).toBe('none')
    expect(linkBetween(a, null)).toBe('none')
  })
})

describe('pickWindow', () => {
  it('finds the entry and its neighbours by seq', () => {
    const w = pickWindow(entries(3, 4), 5)
    expect([w.prev?.seq, w.current?.seq, w.next?.seq]).toEqual([4, 5, 6])
  })
  it('leaves a missing side null', () => {
    const w = pickWindow(entries(2, 1), 1)
    expect([w.prev, w.current?.seq, w.next?.seq]).toEqual([null, 1, 2])
  })
})
