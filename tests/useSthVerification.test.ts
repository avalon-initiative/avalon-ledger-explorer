import { describe, expect, it, vi } from 'vitest'
import { useSthVerification } from '../src/composables/useSthVerification'
import type { SthReport } from '../src/utils/sthReport'

const report: SthReport = { nodeUrl: 'http://node', anchorSource: 'a', verified: true, checks: [] }

describe('useSthVerification', () => {
  it('rejects a non-http(s) URL without verifying', async () => {
    const verify = vi.fn()
    const state = useSthVerification(verify)
    state.nodeUrl.value = 'not a url'
    await state.submit()
    expect(verify).not.toHaveBeenCalled()
    expect(state.error.value).toBe('Enter an http(s) URL for a node.')
    expect(state.phase.value).toBe('failed')
  })

  it('verifies the normalized URL and keeps the report', async () => {
    const verify = vi.fn().mockResolvedValue(report)
    const state = useSthVerification(verify)
    state.nodeUrl.value = 'HTTP://node:8080/'
    await state.submit()
    expect(verify).toHaveBeenCalledWith('http://node:8080')
    expect(state.report.value).toBe(report)
    expect(state.phase.value).toBe('done')
  })

  it('clears the previous report when a new run starts', async () => {
    const state = useSthVerification(vi.fn().mockResolvedValue(report))
    state.nodeUrl.value = 'http://node'
    await state.submit()
    state.nodeUrl.value = 'bad'
    await state.submit()
    expect(state.report.value).toBeNull()
  })

  it('surfaces a thrown error', async () => {
    const state = useSthVerification(vi.fn().mockRejectedValue(new Error('boom')))
    state.nodeUrl.value = 'http://node'
    await state.submit()
    expect(state.error.value).toBe('boom')
    expect(state.phase.value).toBe('failed')
  })

  it('ignores a run superseded by a newer one', async () => {
    let release!: (r: SthReport) => void
    const slow = new Promise<SthReport>((resolve) => (release = resolve))
    const verify = vi.fn().mockReturnValueOnce(slow).mockResolvedValueOnce({ ...report, nodeUrl: 'http://second' })
    const state = useSthVerification(verify)
    state.nodeUrl.value = 'http://first'
    const first = state.submit()
    state.nodeUrl.value = 'http://second'
    await state.submit()
    release({ ...report, nodeUrl: 'http://first' })
    await first
    expect(state.report.value?.nodeUrl).toBe('http://second')
  })
})
