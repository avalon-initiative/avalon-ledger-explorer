import { describe, expect, it, vi } from 'vitest'
import { verifyLatestSth } from '../src/api/sthVerifier'
import type { SthVerifierDeps } from '../src/api/sthVerifier'
import { anchor, head, NETWORK_ID, NOW, staleCosig, witnesses } from './fixtures/heads'

function deps(overrides: Partial<SthVerifierDeps> = {}): SthVerifierDeps {
  return {
    anchorsUrl: 'https://anchors.test/trusted-networks.json',
    fetchAnchors: vi.fn().mockResolvedValue([anchor]),
    getHead: vi.fn().mockResolvedValue(head()),
    buildWitnessList: vi.fn().mockResolvedValue(witnesses),
    now: () => NOW,
    ...overrides,
  }
}

const status = (report: Awaited<ReturnType<typeof verifyLatestSth>>, id: string) => report.checks.find((c) => c.id === id)?.status

describe('verifyLatestSth', () => {
  it('verifies a genuine head with a witness majority', async () => {
    const report = await verifyLatestSth('http://node', deps())
    expect(report.verified).toBe(true)
    expect(report.checks.map((c) => c.status)).toEqual(['pass', 'pass', 'pass'])
    expect(report.cosignatures).toEqual({ knownWitnesses: 3, required: 2, valid: 2 })
    expect(report.anchorSource).toBe('https://anchors.test/trusted-networks.json')
  })

  it('asks the node, never the node, for the witness list', async () => {
    const d = deps()
    await verifyLatestSth('http://node', d)
    expect(d.getHead).toHaveBeenCalledWith('http://node', undefined)
    expect(d.buildWitnessList).toHaveBeenCalledWith(anchor)
  })

  it('fails when the signature does not match the pinned key', async () => {
    const report = await verifyLatestSth('http://node', deps({ getHead: vi.fn().mockResolvedValue(head({ root_hash: 'cd'.repeat(32) })) }))
    expect(report.verified).toBe(false)
    expect(status(report, 'trust-anchor')).toBe('pass')
    expect(status(report, 'signature')).toBe('fail')
    expect(status(report, 'cosignatures')).toBe('skipped')
  })

  it('fails an unknown network without checking the rest', async () => {
    const report = await verifyLatestSth('http://node', deps({ getHead: vi.fn().mockResolvedValue(head({ network_id: 'avalon-other' })) }))
    expect(report.verified).toBe(false)
    expect(status(report, 'trust-anchor')).toBe('fail')
    expect(status(report, 'signature')).toBe('skipped')
    expect(report.network).toBeUndefined()
  })

  it('fails below the witness majority', async () => {
    const one = head().cosignatures.slice(0, 1)
    const report = await verifyLatestSth('http://node', deps({ getHead: vi.fn().mockResolvedValue(head({}, one)) }))
    expect(report.verified).toBe(false)
    expect(status(report, 'cosignatures')).toBe('fail')
    expect(report.cosignatures).toMatchObject({ valid: 1, required: 2 })
  })

  it('does not count a stale cosignature', async () => {
    const stale = [staleCosig, head().cosignatures[1]]
    const report = await verifyLatestSth('http://node', deps({ getHead: vi.fn().mockResolvedValue(head({}, stale)) }))
    expect(report.verified).toBe(false)
    expect(report.cosignatures?.valid).toBe(1)
  })

  it('does not count a cosignature from a witness outside the known list', async () => {
    const report = await verifyLatestSth('http://node', deps({ buildWitnessList: vi.fn().mockResolvedValue(witnesses.slice(1)) }))
    expect(report.cosignatures).toMatchObject({ knownWitnesses: 2, valid: 1 })
    expect(report.verified).toBe(false)
  })

  it('reports an author-only check when fewer than two witnesses are known', async () => {
    const report = await verifyLatestSth('http://node', deps({ buildWitnessList: vi.fn().mockResolvedValue([]) }))
    expect(report.verified).toBe(true)
    expect(status(report, 'cosignatures')).toBe('skipped')
  })

  it('treats a failed witness discovery as no known witnesses, not as a pass of the majority', async () => {
    const report = await verifyLatestSth('http://node', deps({ buildWitnessList: vi.fn().mockRejectedValue(new Error('down')) }))
    expect(report.cosignatures?.knownWitnesses).toBe(0)
    expect(status(report, 'cosignatures')).toBe('skipped')
  })

  it('reports an unreachable node', async () => {
    const report = await verifyLatestSth('http://node', deps({ getHead: vi.fn().mockRejectedValue(new Error('connection refused')) }))
    expect(report.verified).toBe(false)
    expect(report.error).toContain('connection refused')
    expect(report.checks).toEqual([])
  })

  it('reports unavailable trust anchors without verifying', async () => {
    const report = await verifyLatestSth('http://node', deps({ fetchAnchors: vi.fn().mockRejectedValue(new Error('404')) }))
    expect(report.verified).toBe(false)
    expect(report.error).toContain('trust anchors')
    expect(report.head?.sth.network_id).toBe(NETWORK_ID)
  })
})
