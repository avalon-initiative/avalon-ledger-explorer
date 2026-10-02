import { describe, expect, it } from 'vitest'
import { describeKind } from '../src/utils/kindInfo'
import { headSummary } from '../src/utils/headSummary'
import { formatTime } from '../src/utils/timeView'
import type { SthReport } from '../src/utils/sthReport'
import { head } from './fixtures/heads'

describe('describeKind', () => {
  it('explains a known kind in a sentence', () => {
    expect(describeKind('identity.created')).toBe('A new identity was created.')
  })
  it('never leaves an unknown kind blank', () => {
    expect(describeKind('widget.spun_up')).toBe('A widget event: spun up.')
    expect(describeKind('odd')).toBe('An event of kind odd.')
  })
})

describe('formatTime', () => {
  it('shows a readable UTC time', () => {
    expect(formatTime('2026-10-02T12:55:28.631411Z')).toBe('2 Oct 2026, 12:55 UTC')
  })
  it('keeps text that is not a time', () => {
    expect(formatTime('later')).toBe('later')
  })
})

describe('headSummary', () => {
  const base: SthReport = { nodeUrl: 'http://n', anchorSource: 'a', verified: true, checks: [{ id: 'signature', label: 'Author signature', status: 'pass', detail: 'ok' }], head: head({ tree_size: 16 }), cosignatures: { knownWitnesses: 3, valid: 2, required: 2 } }

  it('says a fully verified head is signed and witnessed, with its size', () => {
    const s = headSummary(base)
    expect(s.headline).toBe('Signed by the network and witnessed')
    expect(s.detail).toContain('2 independent witnesses (2 needed)')
    expect(s.detail).toContain('16 entries')
  })
  it('says when witnesses were not checked', () => {
    const s = headSummary({ ...base, checks: [{ id: 'cosignatures', label: 'Witness cosignatures', status: 'skipped', detail: 'x' }] })
    expect(s.headline).toBe('Signed by the network operator')
    expect(s.detail).toContain('not checked')
  })
  it('gives the failing check as the reason', () => {
    const s = headSummary({ ...base, verified: false, checks: [{ id: 'cosignatures', label: 'Witness cosignatures', status: 'fail', detail: '1 valid, 2 required' }] })
    expect(s.headline).toContain('did not pass')
    expect(s.detail).toBe('Witness cosignatures: 1 valid, 2 required')
  })
  it('reports a node that could not be checked', () => {
    expect(headSummary({ nodeUrl: 'u', anchorSource: 'a', verified: false, checks: [], error: 'unreachable' })).toEqual({ headline: 'This node could not be checked', detail: 'unreachable' })
  })
})
