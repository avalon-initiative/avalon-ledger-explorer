import { ref, shallowRef } from 'vue'
import type { TrustAnchorEntry } from '@avalon-initiative/protocol-sdk'
import { connectToNetwork, defaultNetworkDeps, loadNetworks } from '../api/network'
import type { NetworkConnection, NetworkDeps, NetworkOption } from '../api/network'
import { useSthVerification } from './useSthVerification'

export type NetworksPhase = 'loading' | 'ready' | 'failed'

/** Which node to explore: a network chosen from the trust anchors, or a URL typed in. */
export function useConnection(sth = useSthVerification(), deps: NetworkDeps = defaultNetworkDeps) {
  const networks = shallowRef<NetworkOption[]>([])
  const networksPhase = ref<NetworksPhase>('loading')
  const networksError = ref('')
  const selectedNetwork = ref('')
  const connecting = ref(false)
  const connectError = ref('')
  const nodes = shallowRef<NetworkConnection['nodes']>([])
  let anchors: TrustAnchorEntry[] = []
  let run = 0

  async function loadList() {
    networksPhase.value = 'loading'
    try {
      const loaded = await loadNetworks(deps)
      anchors = loaded.anchors
      networks.value = loaded.networks
      networksPhase.value = 'ready'
    } catch (err) {
      networksError.value = err instanceof Error ? err.message : String(err)
      networksPhase.value = 'failed'
    }
  }

  /** Finds a verified node of the network and verifies its latest head. */
  async function connect(networkId: string) {
    const mine = ++run
    selectedNetwork.value = networkId
    connectError.value = ''
    nodes.value = []
    connecting.value = true
    sth.report.value = null
    try {
      const connection = await connectToNetwork(anchors, networkId, deps)
      if (mine !== run) return
      nodes.value = connection.nodes
      await useNode(connection.serverUrl)
    } catch (err) {
      if (mine === run) connectError.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (mine === run) connecting.value = false
    }
  }

  /** Verifies and explores one specific node. */
  async function useNode(url: string) {
    sth.nodeUrl.value = url
    await sth.submit()
  }

  /** Verifies the typed URL, which leaves any network choice behind. */
  async function submitUrl() {
    run++
    selectedNetwork.value = ''
    nodes.value = []
    connectError.value = ''
    connecting.value = false
    await sth.submit()
  }

  return { ...sth, networks, networksPhase, networksError, selectedNetwork, connecting, connectError, nodes, loadList, connect, useNode, submitUrl }
}
