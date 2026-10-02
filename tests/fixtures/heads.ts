import type { CosignedTreeHead, KnownWitness, TrustAnchorEntry } from '@avalon-initiative/protocol-sdk'

// Real signatures taken from the SDK conformance vector witness-cosigned-tree-head.json.
export const NETWORK_ID = 'avalon-conformance-test'
export const CREATED_AT = '2026-09-21T14:13:20Z'
export const OBSERVED_AT = '2026-09-21T14:23:20Z'
export const NOW = new Date('2026-09-21T14:23:20Z')

export const anchor: TrustAnchorEntry = {
  label: 'conformance',
  network_id: NETWORK_ID,
  verify_key: 'd04ab232742bb4ab3a1368bd4615e4e6d0224ab71a016baf8520a332c9778737',
  signing_key_id: 'settlement-operator-1',
  environment: 'dev',
  seed_nodes: ['http://seed-a', 'http://seed-b', 'http://seed-c'],
}

export const witnesses: KnownWitness[] = [
  { witnessKeyId: 'witness-1', key: 'a09aa5f47a6759802ff955f8dc2d2a14a5c99d23be97f864127ff9383455a4f0' },
  { witnessKeyId: 'witness-2', key: '17cb79fb2b4120f2b1ec65e4198d6e08b28e813feb01e4a400839b85e18080ce' },
  { witnessKeyId: 'witness-3', key: 'd759793bbc13a2819a827c76adb6fba8a49aee007f49f2d0992d99b825ad2c48' },
]

const SIG_1 = 'b205600969a8af3df872e216923906ccefd6c952836c5e28d4e5e2041894c660307189966c50642a7be3e269e6dfb6fdc2a7fbc36554d70e7d4b68def065040d'
const SIG_2 = 'c8793c20653f34320ecdc398d83fb22ab27dc1d3936cfe58ae1d46e77450435767f28cda8ff10e5ddff6a888a9543afb57227c5944c324a933916bd8a207960c'

function cosig(id: string, signature: string) {
  return {
    tree_size: 12,
    root_hash: 'ab'.repeat(32),
    network_id: NETWORK_ID,
    author_created_at: CREATED_AT,
    witness_key_id: id,
    observed_at: OBSERVED_AT,
    signature,
  }
}

export function head(overrides: Partial<CosignedTreeHead['sth']> = {}, cosignatures = [cosig('witness-1', SIG_1), cosig('witness-2', SIG_2)]): CosignedTreeHead {
  return {
    sth: {
      tree_size: 12,
      root_hash: 'ab'.repeat(32),
      network_id: NETWORK_ID,
      signing_key_id: 'settlement-operator-1',
      created_at: CREATED_AT,
      protocol_version: 'v1',
      signature: '0b219c258d45576b0bde9f61789c95a4c367813d064df208bb24d6bc06b78610016d2e31f07a9b8b82e49825b64e17a349929146b14cd99746d8050f3d513b08',
      ...overrides,
    },
    cosignatures,
  }
}

export const staleCosig = { ...cosig('witness-1', SIG_1), observed_at: '2026-09-21T13:00:00Z' }
