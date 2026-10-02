import type { CosignedTreeHead, TrustAnchorEntry } from '@avalon-initiative/protocol-sdk'

export type CheckStatus = 'pass' | 'fail' | 'skipped'

export interface Check {
  id: 'trust-anchor' | 'signature' | 'cosignatures'
  label: string
  status: CheckStatus
  detail: string
}

export interface CosignatureSummary {
  knownWitnesses: number
  required: number
  valid: number
}

export interface SthReport {
  nodeUrl: string
  /** Where the trust anchors came from. */
  anchorSource: string
  verified: boolean
  /** The head as served; absent when the node could not be reached. */
  head?: CosignedTreeHead
  network?: TrustAnchorEntry
  cosignatures?: CosignatureSummary
  checks: Check[]
  /** Set when the run stopped before verification, e.g. an unreachable node. */
  error?: string
}
