import { computed, ref, shallowRef } from 'vue'
import { entriesClient } from '../api/entries'
import type { EntriesClient } from '../api/entries'
import { verifyLatestSth } from '../api/sthVerifier'
import { linkBetween, pickWindow } from '../utils/chainLinks'
import type { ChainWindow } from '../utils/chainLinks'
import type { SthReport } from '../utils/sthReport'

export type ChainPhase = 'idle' | 'loading' | 'ready' | 'failed'

export interface ChainDeps {
  client: EntriesClient
  verifyHead: (nodeUrl: string, shardId: string) => Promise<SthReport>
}

const defaultDeps: ChainDeps = {
  client: entriesClient,
  verifyHead: (nodeUrl, shardId) => verifyLatestSth(nodeUrl, undefined, shardId),
}

const EMPTY: ChainWindow = { prev: null, current: null, next: null }

/** One entry of a shard with its neighbours, stepped along the hash chain; opens at the head's last entry. */
export function useChainNavigator(nodeUrl: string, deps: ChainDeps = defaultDeps) {
  const shardInput = ref('core')
  const shardId = ref('core')
  const phase = ref<ChainPhase>('idle')
  const error = ref('')
  const seq = ref(0)
  const latest = ref(0)
  const seqInput = ref('')
  const window = shallowRef<ChainWindow>(EMPTY)
  let run = 0

  const before = computed(() => linkBetween(window.value.prev, window.value.current))
  const after = computed(() => linkBetween(window.value.current, window.value.next))
  const canStep = computed(() => ({ back: seq.value > 1, forward: latest.value === 0 || seq.value < latest.value }))

  async function show(target: number, mine: number) {
    const since = Math.max(0, target - 2)
    const rows = await deps.client.listEntries(nodeUrl, { shardId: shardId.value, sinceSeq: since, limit: target - since + 1 })
    if (mine !== run) return
    const found = pickWindow(rows, target)
    if (!found.current) {
      error.value = `No entry at seq ${target} in shard ${shardId.value}.`
      phase.value = 'failed'
      return
    }
    window.value = found
    seq.value = target
    seqInput.value = String(target)
    phase.value = 'ready'
  }

  async function guarded(work: (mine: number) => Promise<void>) {
    const mine = ++run
    phase.value = 'loading'
    error.value = ''
    try {
      await work(mine)
    } catch (err) {
      if (mine !== run) return
      error.value = err instanceof Error ? err.message : String(err)
      phase.value = 'failed'
    }
  }

  /** Starts over on the entered shard at its newest entry. */
  async function open(at?: number) {
    shardId.value = shardInput.value.trim() || 'core'
    shardInput.value = shardId.value
    window.value = EMPTY
    await guarded(async (mine) => {
      const report = await deps.verifyHead(nodeUrl, shardId.value)
      if (mine !== run) return
      latest.value = report.head?.sth.tree_size ?? 0
      if (latest.value === 0 && at === undefined) {
        error.value = report.error ?? `Shard ${shardId.value} has no entries on this node.`
        phase.value = 'failed'
        return
      }
      await show(at ?? latest.value, mine)
    })
  }

  async function goTo(target: number) {
    if (!Number.isInteger(target) || target < 1) {
      error.value = 'Enter a whole seq of 1 or more.'
      phase.value = 'failed'
      return
    }
    await guarded((mine) => show(target, mine))
  }

  const step = (by: number) => goTo(seq.value + by)
  const goToInput = () => goTo(Number(seqInput.value.trim()))

  return { shardInput, shardId, phase, error, seq, latest, seqInput, window, before, after, canStep, open, goTo, step, goToInput }
}
