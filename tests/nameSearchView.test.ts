import { describe, expect, it } from 'vitest'
import { createdName, matchNames, rankCandidates } from '../src/utils/nameSearch'
import { createdEntry, entries } from './fixtures/entries'

describe('createdName', () => {
  it('reads an identity.created payload', () => {
    expect(createdName(createdEntry(1, 'id-1', 'Alice'))).toEqual({ identityId: 'id-1', displayName: 'Alice' })
  })
  it('ignores other kinds, pruned payloads and malformed payloads', () => {
    expect(createdName(entries(1)[0])).toBeNull()
    expect(createdName({ ...createdEntry(1, 'id-1', 'A'), payload: null })).toBeNull()
    expect(createdName({ ...createdEntry(1, 'id-1', 'A'), payload: { identity_id: 'id-1' } })).toBeNull()
  })
})

describe('matchNames', () => {
  const rows = [createdEntry(1, 'a', 'Alice'), createdEntry(2, 'b', 'ALICE'), createdEntry(3, 'c', 'Malice'), createdEntry(4, 'd', 'Bob'), ...entries(1, 5)]
  it('matches a substring case-insensitively and keeps duplicates', () => {
    expect(matchNames(rows, 'alice').map((m) => m.identityId)).toEqual(['a', 'b', 'c'])
  })
  it('matches nothing for an empty query', () => {
    expect(matchNames(rows, '  ')).toEqual([])
  })
})

describe('rankCandidates', () => {
  it('puts exact matches first and flags shared names', () => {
    const found = matchNames([createdEntry(1, 'c', 'Malice'), createdEntry(2, 'b', 'ALICE'), createdEntry(3, 'a', 'Alice')], 'alice')
    const ranked = rankCandidates(found, 'alice')
    expect(ranked.map((c) => c.identityId)).toEqual(['b', 'a', 'c'])
    expect(ranked.map((c) => c.sameNameAs)).toEqual([1, 1, 0])
  })
})
