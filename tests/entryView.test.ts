import { describe, expect, it } from 'vitest'
import { chainContinuity, continuityLabel, filterByKind, kindOptions, payloadText, shortHash } from '../src/utils/entryView'
import { entries } from './fixtures/entries'

describe('entry view helpers', () => {
  it('links a contiguous page by prev_hash', () => {
    expect(chainContinuity(entries(3))).toEqual({ kind: 'linked', count: 3 })
    expect(chainContinuity([])).toEqual({ kind: 'empty' })
  })

  it('flags a sequence gap and a prev_hash mismatch', () => {
    const page = entries(3)
    expect(chainContinuity([page[0], page[2]])).toEqual({ kind: 'broken', atSeq: 3, reason: 'gap' })
    page[1] = { ...page[1], prev_hash: 'ff'.repeat(32) }
    expect(chainContinuity(page)).toEqual({ kind: 'broken', atSeq: 2, reason: 'prev_hash' })
    expect(continuityLabel(chainContinuity(page)).tone).toBe('danger')
  })

  it('derives sorted kinds and filters by them', () => {
    const page = [...entries(2, 1, 'b.kind'), ...entries(1, 3, 'a.kind')]
    expect(kindOptions(page).map((o) => o.value)).toEqual(['a.kind', 'b.kind'])
    expect(filterByKind(page, ['a.kind'])).toHaveLength(1)
    expect(filterByKind(page, [])).toHaveLength(3)
  })

  it('shortens hashes and pretty-prints payloads', () => {
    expect(shortHash('ab'.repeat(32))).toBe('abababababab...')
    expect(payloadText(entries(1)[0])).toContain('\n  "credential_id": "cred-1"')
    expect(payloadText({ ...entries(1)[0], payload: null, payload_pruned: true })).toBe('Payload pruned by this node.')
  })
})
