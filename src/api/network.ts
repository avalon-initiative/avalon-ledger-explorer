import { discoverAmong, fetchTrustAnchors, TRUST_ANCHORS_URL } from '@avalon-initiative/protocol-sdk'
import type { DiscoverResult, TrustAnchorEntry, VerifiedCandidate } from '@avalon-initiative/protocol-sdk'

export interface NetworkOption {
  networkId: string
  label: string
  environment: TrustAnchorEntry['environment']
}

export interface NetworkConnection {
  serverUrl: string
  /** Every node that verified for the network, fastest first; includes `serverUrl`. */
  nodes: VerifiedCandidate[]
}

/** The trust anchors and discovery, injectable so tests never touch the network. */
export interface NetworkDeps {
  anchorsUrl: string
  fetchAnchors: (url: string) => Promise<TrustAnchorEntry[]>
  discover: (anchors: TrustAnchorEntry[], networkId: string) => Promise<DiscoverResult>
}

export const defaultNetworkDeps: NetworkDeps = {
  anchorsUrl: import.meta.env.VITE_AVALON_TRUST_ANCHORS_URL || TRUST_ANCHORS_URL,
  fetchAnchors: (url) => fetchTrustAnchors(url),
  discover: (anchors, networkId) => discoverAmong(anchors, { kind: 'network-id', networkId }),
}

/** Networks with a node to try: an entry with neither a server URL nor seed nodes cannot be connected to. */
export function connectableNetworks(anchors: TrustAnchorEntry[]): NetworkOption[] {
  const seen = new Set<string>()
  const options: NetworkOption[] = []
  for (const entry of anchors) {
    if (seen.has(entry.network_id) || !(entry.server_url || entry.seed_nodes?.length)) continue
    seen.add(entry.network_id)
    options.push({ networkId: entry.network_id, label: entry.label, environment: entry.environment })
  }
  return options
}

export async function loadNetworks(deps: NetworkDeps = defaultNetworkDeps): Promise<{ anchors: TrustAnchorEntry[]; networks: NetworkOption[] }> {
  const anchors = await deps.fetchAnchors(deps.anchorsUrl)
  return { anchors, networks: connectableNetworks(anchors) }
}

/** Picks the fastest node of `networkId` whose tree head verifies against that network's trust anchor. */
export async function connectToNetwork(anchors: TrustAnchorEntry[], networkId: string, deps: NetworkDeps = defaultNetworkDeps): Promise<NetworkConnection> {
  const result = await deps.discover(anchors, networkId)
  const nodes = result.verified.filter((n, i, all) => all.findIndex((o) => o.serverUrl === n.serverUrl) === i)
  return { serverUrl: result.serverUrl, nodes }
}
