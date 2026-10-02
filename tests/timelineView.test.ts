import { describe, expect, it } from 'vitest'
import { groupByKind, namesIdentity, parseIdentityId } from '../src/utils/timelineView'
import { entries } from './fixtures/entries'

const ID = 'aeffc91b-0000-4000-8000-000000000001'

describe('parseIdentityId', () => {
  it('accepts a bare uuid or the identity: form, any case', () => {
    expect(parseIdentityId(ID)).toBe(ID)
    expect(parseIdentityId(` identity:${ID.toUpperCase()} `)).toBe(ID)
  })
  it('rejects anything else', () => {
    expect(parseIdentityId('')).toBeNull()
    expect(parseIdentityId('alice')).toBeNull()
    expect(parseIdentityId(`guild:${ID}`)).toBeNull()
  })
})

describe('namesIdentity', () => {
  const [entry] = entries(1)
  it('matches the subject and its compound forms', () => {
    expect(namesIdentity({ ...entry, subject: `identity:${ID}`, payload: null }, ID)).toBe(true)
    expect(namesIdentity({ ...entry, subject: `identity:${ID}:self:x`, payload: null }, ID)).toBe(true)
  })
  it('matches an entry whose payload carries the id', () => {
    expect(namesIdentity({ ...entry, subject: 'guild:g1', payload: { member: ID } }, ID)).toBe(true)
  })
  it('does not match another identity, even one sharing a prefix', () => {
    expect(namesIdentity({ ...entry, subject: `identity:${ID}0:self`, payload: null }, ID)).toBe(false)
    expect(namesIdentity({ ...entry, subject: 'guild:g1', payload: { other: 'x' } }, ID)).toBe(false)
  })
  it('copes with a pruned payload', () => {
    expect(namesIdentity({ ...entry, subject: 'guild:g1', payload: null, payload_pruned: true }, ID)).toBe(false)
  })
})

describe('groupByKind', () => {
  it('orders groups by kind and entries by seq', () => {
    const groups = groupByKind([...entries(1, 3, 'b'), ...entries(2, 1, 'a'), ...entries(1, 2, 'b')].reverse())
    expect(groups.map((g) => g.kind)).toEqual(['a', 'b'])
    expect(groups[1].entries.map((e) => e.seq)).toEqual([2, 3])
  })
})
