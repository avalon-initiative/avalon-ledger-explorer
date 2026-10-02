import { describe, expect, it } from 'vitest'
import type { SthReport } from '../src/utils/sthReport'
import { checkTone, headItems, verdict } from '../src/utils/sthView'
import { head } from './fixtures/heads'

const base: SthReport = { nodeUrl: 'http://node', anchorSource: 'https://a', verified: true, head: head(), checks: [{ id: 'signature', label: 's', status: 'pass', detail: '' }] }

describe('sthView', () => {
  it('reads a full pass as verified', () => {
    expect(verdict(base)).toEqual({ label: 'Verified', tone: 'success' })
  })

  it('never reads a partial check as a clean pass', () => {
    const partial = { ...base, checks: [{ id: 'cosignatures' as const, label: 'c', status: 'skipped' as const, detail: '' }] }
    expect(verdict(partial).tone).toBe('warning')
  })

  it('reads a failure or error as not verified', () => {
    expect(verdict({ ...base, verified: false }).label).toBe('Not verified')
    expect(verdict({ ...base, error: 'x' }).tone).toBe('danger')
  })

  it('maps each status to a tone', () => {
    expect([checkTone('pass'), checkTone('fail'), checkTone('skipped')]).toEqual(['success', 'danger', 'warning'])
  })

  it('lists the head fields, and none without a head', () => {
    expect(headItems(base).find((i) => i.label === 'Tree size')?.value).toBe('12')
    expect(headItems({ ...base, head: undefined })).toEqual([])
  })
})
