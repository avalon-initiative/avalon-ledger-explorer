import { describe, expect, it, vi } from 'vitest'
import type { TrustAnchorEntry } from '@avalon-initiative/protocol-sdk'
import { connectableNetworks, connectToNetwork, loadNetworks } from '../src/api/network'
import type { NetworkDeps } from '../src/api/network'
import { anchor } from './fixtures/heads'

const entry = (over: Partial<TrustAnchorEntry>): TrustAnchorEntry => ({ ...anchor, ...over })

describe('connectableNetworks', () => {
  it('keeps networks with a server url or seeds, once each', () => {
    const anchors = [
      entry({ network_id: 'a', seed_nodes: ['http://a'] }),
      entry({ network_id: 'a', seed_nodes: ['http://a2'] }),
      entry({ network_id: 'b', seed_nodes: [], server_url: 'http://b' }),
      entry({ network_id: 'c', seed_nodes: [], server_url: undefined }),
    ]
    expect(connectableNetworks(anchors).map((n) => n.networkId)).toEqual(['a', 'b'])
  })
})

describe('loadNetworks and connectToNetwork', () => {
  const deps = (): NetworkDeps => ({
    anchorsUrl: 'http://anchors',
    fetchAnchors: vi.fn().mockResolvedValue([anchor]),
    discover: vi.fn().mockResolvedValue({ serverUrl: 'http://seed-b', entry: anchor, verified: [{ serverUrl: 'http://seed-b', latencyMs: 4 }, { serverUrl: 'http://seed-a', latencyMs: null }] }),
  })

  it('reads the anchors from the configured url', async () => {
    const d = deps()
    const { networks } = await loadNetworks(d)
    expect(d.fetchAnchors).toHaveBeenCalledWith('http://anchors')
    expect(networks).toEqual([{ networkId: anchor.network_id, label: anchor.label, environment: anchor.environment }])
  })

  it('returns the chosen node and the other verified ones', async () => {
    const d = deps()
    const connection = await connectToNetwork([anchor], anchor.network_id, d)
    expect(d.discover).toHaveBeenCalledWith([anchor], anchor.network_id)
    expect(connection.serverUrl).toBe('http://seed-b')
    expect(connection.nodes).toHaveLength(2)
  })

  it('lists a node once when an entry names it as both server and seed', async () => {
    const d = deps()
    d.discover = vi.fn().mockResolvedValue({ serverUrl: 'http://a', entry: anchor, verified: [{ serverUrl: 'http://a', latencyMs: 1 }, { serverUrl: 'http://a', latencyMs: 2 }] })
    expect((await connectToNetwork([anchor], anchor.network_id, d)).nodes).toHaveLength(1)
  })
})
