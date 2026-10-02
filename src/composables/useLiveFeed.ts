import { computed, ref, shallowRef } from 'vue'
import { entriesClient } from '../api/entries'
import type { EntriesClient, LedgerEntry } from '../api/entries'
import { verifyLatestSth } from '../api/sthVerifier'
import { filterByKind, kindOptions } from '../utils/entryView'
import type { SthReport } from '../utils/sthReport'
import { namesIdentity, parseIdentityId } from '../utils/timelineView'

export const POLL_MS = 3000
/** Entries shown from before the feed started, so it opens with some context. */
export const BACKLOG = 25
export const POLL_LIMIT = 200
/** Newest entries kept in the feed. */
export const FEED_CAP = 500

export type FeedPhase = 'idle' | 'starting' | 'running' | 'paused' | 'failed'

export interface LiveFeedDeps {
  client: EntriesClient
  verifyHead: (nodeUrl: string, shardId: string) => Promise<SthReport>
  /** Schedules `fn` every `ms`; returns the stopper. */
  every: (fn: () => void, ms: number) => () => void
}

const defaultDeps: LiveFeedDeps = {
  client: entriesClient,
  verifyHead: (nodeUrl, shardId) => verifyLatestSth(nodeUrl, undefined, shardId),
  every: (fn, ms) => {
    const id = setInterval(fn, ms)
    return () => clearInterval(id)
  },
}

/** A shard's new entries, polled by sequence number, with the head re-verified whenever entries arrive. */
export function useLiveFeed(nodeUrl: string, deps: LiveFeedDeps = defaultDeps) {
  const shardInput = ref('core')
  const shardId = ref('core')
  const followInput = ref('')
  const selectedKinds = ref<string[]>([])
  const phase = ref<FeedPhase>('idle')
  const error = ref('')
  const feed = shallowRef<LedgerEntry[]>([])
  const head = shallowRef<SthReport | null>(null)
  const broken = ref<{ atSeq: number } | null>(null)
  let lastSeq = 0
  let last: LedgerEntry | null = null
  let stopTimer: (() => void) | null = null
  let polling = false
  let run = 0

  const followId = computed(() => parseIdentityId(followInput.value))
  const followInvalid = computed(() => followInput.value.trim() !== '' && followId.value === null)
  /** Newest first, narrowed by the kind filter and the followed identity. */
  const visible = computed(() => {
    const id = followId.value
    const byKind = filterByKind(feed.value, selectedKinds.value)
    return id ? byKind.filter((e) => namesIdentity(e, id)) : byKind
  })
  const kinds = computed(() => kindOptions(feed.value))

  function halt() {
    stopTimer?.()
    stopTimer = null
  }

  function fail(message: string) {
    halt()
    error.value = message
    phase.value = 'failed'
  }

  function absorb(rows: LedgerEntry[]) {
    for (const row of rows) {
      if (last && !broken.value && (row.seq !== last.seq + 1 || row.prev_hash !== last.entry_hash)) broken.value = { atSeq: row.seq }
      last = row
    }
    lastSeq = rows[rows.length - 1].seq
    feed.value = [...rows].reverse().concat(feed.value).slice(0, FEED_CAP)
  }

  async function reverify(mine: number) {
    try {
      const report = await deps.verifyHead(nodeUrl, shardId.value)
      if (mine === run) head.value = report
    } catch {
      // A failed re-check keeps the previous head on screen; the next arrival retries it.
    }
  }

  async function poll(mine: number) {
    if (polling) return
    polling = true
    try {
      const rows = await deps.client.listEntries(nodeUrl, { shardId: shardId.value, sinceSeq: lastSeq, limit: POLL_LIMIT })
      if (mine !== run || phase.value !== 'running' || rows.length === 0) return
      absorb(rows)
      void reverify(mine)
    } catch (err) {
      if (mine === run && phase.value === 'running') fail(err instanceof Error ? err.message : String(err))
    } finally {
      polling = false
    }
  }

  /** Verifies the head, opens at its last few entries, then polls. */
  async function start() {
    halt()
    const mine = ++run
    shardId.value = shardInput.value.trim() || 'core'
    shardInput.value = shardId.value
    feed.value = []
    head.value = null
    broken.value = null
    selectedKinds.value = []
    last = null
    error.value = ''
    phase.value = 'starting'
    try {
      const report = await deps.verifyHead(nodeUrl, shardId.value)
      if (mine !== run) return
      head.value = report
      const size = report.head?.sth.tree_size
      if (size === undefined) return fail(report.error ?? 'The node did not serve a tree head for this shard.')
      lastSeq = Math.max(0, size - BACKLOG)
      phase.value = 'running'
      await poll(mine)
      if (mine === run && phase.value === 'running') stopTimer = deps.every(() => void poll(mine), POLL_MS)
    } catch (err) {
      if (mine === run) fail(err instanceof Error ? err.message : String(err))
    }
  }

  function pause() {
    if (phase.value !== 'running') return
    halt()
    phase.value = 'paused'
  }

  /** Continues from the last seq read, so entries that arrived while paused are not skipped. */
  async function resume() {
    if (phase.value !== 'paused') return
    const mine = run
    phase.value = 'running'
    await poll(mine)
    if (mine === run && phase.value === 'running') stopTimer = deps.every(() => void poll(mine), POLL_MS)
  }

  function stop() {
    run++
    halt()
  }

  return { shardInput, shardId, followInput, followInvalid, selectedKinds, phase, error, feed, visible, kinds, head, broken, start, pause, resume, stop }
}
