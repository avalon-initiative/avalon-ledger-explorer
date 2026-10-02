import type { AvalonSelectOption } from '@avalon-initiative/common-ui'
import type { VerifiedCandidate } from '@avalon-initiative/protocol-sdk'
import type { NetworkOption } from '../api/network'

const TIERS: Record<NetworkOption['environment'], string> = {
  'local-dev': 'Local development',
  dev: 'Development',
  int: 'Integration',
  prod: 'Production',
}

export function networkChoices(networks: NetworkOption[]): AvalonSelectOption[] {
  return networks.map((n) => ({ value: n.networkId, label: n.networkId, description: TIERS[n.environment] }))
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function nodeChoices(nodes: VerifiedCandidate[]): AvalonSelectOption[] {
  return nodes.map((n) => ({
    value: n.serverUrl,
    label: hostOf(n.serverUrl),
    description: n.latencyMs === null ? undefined : `${Math.round(n.latencyMs)} ms`,
    title: n.serverUrl,
  }))
}
