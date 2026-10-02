import {
  buildKnownList,
  DEFAULT_COSIGN_FRESHNESS_SECONDS,
  evaluateNetworkTrust,
  fetchTrustAnchors,
  getCosignedTreeHead,
  majorityThreshold,
  TRUST_ANCHORS_URL,
  verifyCosignedTreeHead,
  verifyWitnessCosignature,
} from '@avalon-initiative/protocol-sdk'
import type { CosignedTreeHead, KnownWitness, TrustAnchorEntry } from '@avalon-initiative/protocol-sdk'
import type { Check, CosignatureSummary, SthReport } from '../utils/sthReport'

/** The network and trust inputs, injectable so tests never touch the network. */
export interface SthVerifierDeps {
  anchorsUrl: string
  fetchAnchors: (url: string) => Promise<TrustAnchorEntry[]>
  getHead: (nodeUrl: string) => Promise<CosignedTreeHead>
  buildWitnessList: (entry: TrustAnchorEntry) => Promise<KnownWitness[]>
  now: () => Date
}

export const defaultDeps: SthVerifierDeps = {
  anchorsUrl: import.meta.env.VITE_AVALON_TRUST_ANCHORS_URL || TRUST_ANCHORS_URL,
  fetchAnchors: (url) => fetchTrustAnchors(url),
  getHead: (nodeUrl) => getCosignedTreeHead(nodeUrl),
  buildWitnessList: (entry) => buildKnownList({ entry }),
  now: () => new Date(),
}

function failed(nodeUrl: string, anchorSource: string, error: string, head?: CosignedTreeHead): SthReport {
  return { nodeUrl, anchorSource, verified: false, head, checks: [], error }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Cosignatures that bind this head, come from a known witness, verify and are fresh. */
function countValid(entry: TrustAnchorEntry, head: CosignedTreeHead, known: KnownWitness[], cutoff: Date, now: Date): number {
  const ids = new Set<string>()
  for (const witness of known) {
    if (witness.key.toLowerCase() === entry.verify_key.toLowerCase()) ids.add(witness.witnessKeyId)
  }
  for (const cosig of head.cosignatures) {
    const witness = known.find((w) => w.witnessKeyId === cosig.witness_key_id)
    const observed = Date.parse(cosig.observed_at)
    const bound = cosig.tree_size === head.sth.tree_size && cosig.root_hash === head.sth.root_hash && cosig.network_id === head.sth.network_id
    if (witness && bound && observed >= cutoff.getTime() && observed <= now.getTime() && verifyWitnessCosignature(witness.key, cosig)) {
      ids.add(cosig.witness_key_id)
    }
  }
  return ids.size
}

/** Fetches a node's latest cosigned head and verifies it locally; trusts nothing the node says about itself. */
export async function verifyLatestSth(nodeUrl: string, deps: SthVerifierDeps = defaultDeps): Promise<SthReport> {
  const anchorSource = deps.anchorsUrl
  let head: CosignedTreeHead
  try {
    head = await deps.getHead(nodeUrl)
  } catch (err) {
    return failed(nodeUrl, anchorSource, `Could not read the latest tree head: ${message(err)}`)
  }
  let anchors: TrustAnchorEntry[]
  try {
    anchors = await deps.fetchAnchors(anchorSource)
  } catch (err) {
    return failed(nodeUrl, anchorSource, `Could not load the trust anchors: ${message(err)}`, head)
  }

  const trust = evaluateNetworkTrust(anchors, head.sth)
  if (trust.kind === 'unreachable') return failed(nodeUrl, anchorSource, trust.detail, head)
  const claimed = head.sth.network_id
  const anchorCheck: Check =
    trust.kind === 'unknown-network'
      ? { id: 'trust-anchor', label: 'Trust anchor', status: 'fail', detail: `Network ${claimed} is not in the trust-anchor list.` }
      : { id: 'trust-anchor', label: 'Trust anchor', status: 'pass', detail: `Network ${claimed} is pinned as ${trust.entry.label} (${trust.entry.environment}).` }
  if (trust.kind === 'unknown-network') {
    const skipped = (id: 'signature' | 'cosignatures', label: string): Check => ({ id, label, status: 'skipped', detail: 'No pinned key to check against.' })
    return {
      nodeUrl,
      anchorSource,
      verified: false,
      head,
      checks: [anchorCheck, skipped('signature', 'Author signature'), skipped('cosignatures', 'Witness cosignatures')],
    }
  }

  const entry = trust.entry
  const signatureOk = trust.kind === 'verified'
  const signature: Check = {
    id: 'signature',
    label: 'Author signature',
    status: signatureOk ? 'pass' : 'fail',
    detail: signatureOk
      ? `Signature verifies against the pinned key ${entry.verify_key.slice(0, 16)}.`
      : 'Signature does NOT verify against the pinned key for this network.',
  }
  if (!signatureOk) {
    const cosignatures: Check = { id: 'cosignatures', label: 'Witness cosignatures', status: 'skipped', detail: 'Not checked: the author signature failed.' }
    return { nodeUrl, anchorSource, verified: false, head, network: entry, checks: [anchorCheck, signature, cosignatures] }
  }

  const now = deps.now()
  const cutoff = new Date(now.getTime() - DEFAULT_COSIGN_FRESHNESS_SECONDS * 1000)
  let known: KnownWitness[]
  try {
    known = await deps.buildWitnessList(entry)
  } catch {
    known = []
  }
  const summary: CosignatureSummary = {
    knownWitnesses: known.length,
    required: majorityThreshold(known.length),
    valid: countValid(entry, head, known, cutoff, now),
  }
  if (known.length < 2) {
    const note = `Only ${known.length} known witness${known.length === 1 ? '' : 'es'} found from the network's seed nodes; the policy needs two, so only the author signature was checked.`
    const cosignatures: Check = { id: 'cosignatures', label: 'Witness cosignatures', status: 'skipped', detail: note }
    return { nodeUrl, anchorSource, verified: true, head, network: entry, cosignatures: summary, checks: [anchorCheck, signature, cosignatures] }
  }
  const majority = verifyCosignedTreeHead(entry.verify_key, head, known, cutoff, now)
  const cosignatures: Check = {
    id: 'cosignatures',
    label: 'Witness cosignatures',
    status: majority ? 'pass' : 'fail',
    detail: `${summary.valid} valid, fresh cosignatures from ${summary.knownWitnesses} known witnesses; ${summary.required} required.`,
  }
  return { nodeUrl, anchorSource, verified: majority, head, network: entry, cosignatures: summary, checks: [anchorCheck, signature, cosignatures] }
}
