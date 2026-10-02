import { computed, ref, shallowRef } from 'vue'
import { entriesClient } from '../api/entries'
import type { EntriesClient, LedgerEntry } from '../api/entries'
import { groupByKind, namesIdentity, parseIdentityId } from '../utils/timelineView'

export const SCAN_PAGE_SIZE = 1000
/** Pages scanned per run; a longer shard needs the scan continued. */
export const MAX_SCAN_PAGES = 20

export type TimelinePhase = 'idle' | 'scanning' | 'done' | 'failed'

/** One identity's entries found by scanning a shard's pages; the node's subject filter only matches exact compound subjects. */
export function useIdentityTimeline(nodeUrl: string, client: EntriesClient = entriesClient) {
  const identityInput = ref('')
  const shardInput = ref('core')
  const shardId = ref('core')
  const phase = ref<TimelinePhase>('idle')
  const error = ref('')
  const matches = shallowRef<LedgerEntry[]>([])
  const scanned = ref(0)
  const reachedEnd = ref(false)
  const lastSeq = ref(0)
  let run = 0

  const identityId = computed(() => parseIdentityId(identityInput.value))
  const groups = computed(() => groupByKind(matches.value))

  async function scan(fromSeq: number, mine: number, id: string) {
    let since = fromSeq
    for (let page = 0; page < MAX_SCAN_PAGES; page++) {
      const rows = await client.listEntries(nodeUrl, { shardId: shardId.value, sinceSeq: since, limit: SCAN_PAGE_SIZE })
      if (mine !== run) return
      scanned.value += rows.length
      matches.value = [...matches.value, ...rows.filter((e) => namesIdentity(e, id))]
      if (rows.length > 0) since = rows[rows.length - 1].seq
      lastSeq.value = since
      if (rows.length < SCAN_PAGE_SIZE) {
        reachedEnd.value = true
        return
      }
    }
  }

  async function startScan(fromSeq: number) {
    const id = identityId.value
    if (!id) {
      error.value = 'Enter an identity id: a uuid, or identity:<uuid>.'
      phase.value = 'failed'
      return
    }
    const mine = ++run
    phase.value = 'scanning'
    error.value = ''
    reachedEnd.value = false
    try {
      await scan(fromSeq, mine, id)
      if (mine === run) phase.value = 'done'
    } catch (err) {
      if (mine !== run) return
      error.value = err instanceof Error ? err.message : String(err)
      phase.value = 'failed'
    }
  }

  /** Starts a fresh scan of the entered shard from its first entry. */
  async function search() {
    shardId.value = shardInput.value.trim() || 'core'
    shardInput.value = shardId.value
    matches.value = []
    scanned.value = 0
    lastSeq.value = 0
    await startScan(0)
  }

  /** Continues the scan past the pages already read. */
  async function continueScan() {
    if (phase.value === 'scanning' || reachedEnd.value) return
    await startScan(lastSeq.value)
  }

  return { identityInput, shardInput, shardId, phase, error, matches, groups, scanned, reachedEnd, identityId, search, continueScan }
}
