import { describe, expect, it, vi } from 'vitest'
import { useConnection } from '../src/composables/useConnection'
import { useSthVerification } from '../src/composables/useSthVerification'
import type { NetworkDeps } from '../src/api/network'
import type { SthReport } from '../src/utils/sthReport'
import { anchor } from './fixtures/heads'

const report = (nodeUrl: string): SthReport => ({ nodeUrl, anchorSource: 'a', verified: true, checks: [] })

function setup(discover: NetworkDeps['discover'] = vi.fn().mockResolvedValue({ serverUrl: 'http://seed-a', entry: anchor, verified: [{ serverUrl: 'http://seed-a', latencyMs: 3 }, { serverUrl: 'http://seed-b', latencyMs: 9 }] })) {
  const verify = vi.fn((url: string) => Promise.resolve(report(url)))
  const deps: NetworkDeps = { anchorsUrl: 'u', fetchAnchors: vi.fn().mockResolvedValue([anchor]), discover }
  return { verify, deps, c: useConnection(useSthVerification(verify), deps) }
}

describe('useConnection', () => {
  it('lists networks, then connects: discovers a node and verifies its head', async () => {
    const { c, verify } = setup()
    await c.loadList()
    expect(c.networksPhase.value).toBe('ready')
    await c.connect(anchor.network_id)
    expect(verify).toHaveBeenCalledWith('http://seed-a')
    expect(c.report.value?.nodeUrl).toBe('http://seed-a')
    expect(c.nodes.value).toHaveLength(2)
    expect(c.connecting.value).toBe(false)
  })

  it('switches to another verified node', async () => {
    const { c, verify } = setup()
    await c.loadList()
    await c.connect(anchor.network_id)
    await c.useNode('http://seed-b')
    expect(verify).toHaveBeenLastCalledWith('http://seed-b')
  })

  it('reports a network with no verifying node', async () => {
    const { c, verify } = setup(vi.fn().mockRejectedValue(new Error('no candidate verified')))
    await c.loadList()
    await c.connect(anchor.network_id)
    expect(c.connectError.value).toBe('no candidate verified')
    expect(verify).not.toHaveBeenCalled()
  })

  it('keeps the manual URL working when the network list cannot load', async () => {
    const { verify, deps } = setup()
    deps.fetchAnchors = vi.fn().mockRejectedValue(new Error('offline'))
    const c = useConnection(useSthVerification(verify), deps)
    await c.loadList()
    expect(c.networksPhase.value).toBe('failed')
    c.nodeUrl.value = 'http://typed:8080'
    await c.submitUrl()
    expect(verify).toHaveBeenCalledWith('http://typed:8080')
    expect(c.selectedNetwork.value).toBe('')
  })
})
