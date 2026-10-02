import { computed, ref, shallowRef } from 'vue'
import { entriesClient } from '../api/entries'
import type { EntriesClient, LedgerEntry } from '../api/entries'
import { verifyLatestSth } from '../api/sthVerifier'
import type { SthReport } from '../utils/sthReport'
import { chainContinuity, filterByKind, kindOptions } from '../utils/entryView'

export const DEFAULT_SHARD = 'core'
export const PAGE_SIZE = 50

export type EntriesPhase = 'idle' | 'loading' | 'done' | 'failed'

export interface ShardEntriesDeps {
  client: EntriesClient
  verifyHead: (nodeUrl: string, shardId: string) => Promise<SthReport>
}

const defaultDeps: ShardEntriesDeps = {
  client: entriesClient,
  verifyHead: (nodeUrl, shardId) => verifyLatestSth(nodeUrl, undefined, shardId),
}

/** One node's shard entries, paged by sequence number, with the shard head's verification beside them. */
export function useShardEntries(nodeUrl: string, deps: ShardEntriesDeps = defaultDeps) {
  const shardInput = ref(DEFAULT_SHARD)
  const shardId = ref(DEFAULT_SHARD)
  const phase = ref<EntriesPhase>('idle')
  const error = ref('')
  const entries = shallowRef<LedgerEntry[]>([])
  const head = shallowRef<SthReport | null>(null)
  const selectedKinds = ref<string[]>([])
  const expanded = ref<number[]>([])
  const starts = ref<number[]>([0])
  let run = 0

  const sinceSeq = computed(() => starts.value[starts.value.length - 1])
  const hasPrevious = computed(() => starts.value.length > 1)
  const hasNext = computed(() => entries.value.length === PAGE_SIZE)
  const visible = computed(() => filterByKind(entries.value, selectedKinds.value))
  const kinds = computed(() => kindOptions(entries.value))
  const continuity = computed(() => chainContinuity(entries.value))

  async function fetchPage() {
    const mine = ++run
    phase.value = 'loading'
    error.value = ''
    try {
      const page = await deps.client.listEntries(nodeUrl, { shardId: shardId.value, sinceSeq: sinceSeq.value, limit: PAGE_SIZE })
      if (mine !== run) return
      entries.value = page
      expanded.value = []
      phase.value = 'done'
    } catch (err) {
      if (mine !== run) return
      entries.value = []
      error.value = err instanceof Error ? err.message : String(err)
      phase.value = 'failed'
    }
  }

  /** Starts over on the entered shard: first page, new head verification, filter cleared. */
  async function load() {
    shardId.value = shardInput.value.trim() || DEFAULT_SHARD
    shardInput.value = shardId.value
    starts.value = [0]
    selectedKinds.value = []
    head.value = null
    const forShard = shardId.value
    deps.verifyHead(nodeUrl, forShard).then(
      (report) => {
        if (shardId.value === forShard) head.value = report
      },
      () => undefined,
    )
    await fetchPage()
  }

  async function next() {
    const last = entries.value[entries.value.length - 1]
    if (!hasNext.value || !last) return
    starts.value = [...starts.value, last.seq]
    await fetchPage()
  }

  async function previous() {
    if (!hasPrevious.value) return
    starts.value = starts.value.slice(0, -1)
    await fetchPage()
  }

  function toggle(seq: number) {
    expanded.value = expanded.value.includes(seq) ? expanded.value.filter((s) => s !== seq) : [...expanded.value, seq]
  }

  return { shardInput, shardId, phase, error, entries, head, selectedKinds, expanded, sinceSeq, hasPrevious, hasNext, visible, kinds, continuity, load, next, previous, toggle }
}
