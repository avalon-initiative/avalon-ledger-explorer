import { computed, ref, shallowRef } from 'vue'
import { entriesClient } from '../api/entries'
import type { EntriesClient, LedgerEntry } from '../api/entries'
import { matchNames, rankCandidates } from '../utils/nameSearch'
import { scanShard } from './shardScan'

export type NameSearchPhase = 'idle' | 'scanning' | 'done' | 'failed'

/** Display-name candidates found by scanning a shard's `identity.created` entries; the ledger has no name index. */
export function useNameSearch(nodeUrl: string, client: EntriesClient = entriesClient) {
  const queryInput = ref('')
  const shardInput = ref('core')
  const shardId = ref('core')
  const phase = ref<NameSearchPhase>('idle')
  const error = ref('')
  const found = shallowRef<ReturnType<typeof matchNames>>([])
  const searched = ref('')
  const scanned = ref(0)
  const reachedEnd = ref(false)
  const lastSeq = ref(0)
  let run = 0

  const candidates = computed(() => rankCandidates(found.value, searched.value))

  async function scan(fromSeq: number) {
    const mine = ++run
    phase.value = 'scanning'
    error.value = ''
    reachedEnd.value = false
    const onRows = (rows: LedgerEntry[]) => {
      scanned.value += rows.length
      found.value = [...found.value, ...matchNames(rows, searched.value)]
    }
    try {
      const result = await scanShard(client, { nodeUrl, shardId: shardId.value, fromSeq, isStale: () => mine !== run, onRows })
      if (mine !== run) return
      lastSeq.value = result.lastSeq
      reachedEnd.value = result.reachedEnd
      phase.value = 'done'
    } catch (err) {
      if (mine !== run) return
      error.value = err instanceof Error ? err.message : String(err)
      phase.value = 'failed'
    }
  }

  /** Starts a fresh scan of the entered shard for the entered name. */
  async function search() {
    searched.value = queryInput.value.trim()
    if (!searched.value) {
      error.value = 'Enter part of a display name.'
      phase.value = 'failed'
      return
    }
    shardId.value = shardInput.value.trim() || 'core'
    shardInput.value = shardId.value
    found.value = []
    scanned.value = 0
    lastSeq.value = 0
    await scan(0)
  }

  /** Continues the scan past the pages already read. */
  async function continueScan() {
    if (phase.value === 'scanning' || reachedEnd.value) return
    await scan(lastSeq.value)
  }

  return { queryInput, shardInput, shardId, phase, error, candidates, searched, scanned, reachedEnd, search, continueScan }
}
