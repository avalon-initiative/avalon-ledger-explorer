import { ref, shallowRef } from 'vue'
import { normalizeNodeUrl } from '@avalon-initiative/protocol-sdk'
import { verifyLatestSth } from '../api/sthVerifier'
import type { SthReport } from '../utils/sthReport'

export type VerifyPhase = 'idle' | 'verifying' | 'done' | 'failed'

/** Form state and the verification run behind the view; keeps it glue-only. */
export function useSthVerification(verify: (nodeUrl: string) => Promise<SthReport> = verifyLatestSth) {
  const nodeUrl = ref('')
  const phase = ref<VerifyPhase>('idle')
  const error = ref('')
  const report = shallowRef<SthReport | null>(null)
  let run = 0

  async function submit() {
    report.value = null
    const url = normalizeNodeUrl(nodeUrl.value)
    if (!url) {
      error.value = 'Enter an http(s) URL for a node.'
      phase.value = 'failed'
      return
    }
    const mine = ++run
    error.value = ''
    phase.value = 'verifying'
    try {
      const result = await verify(url)
      if (mine !== run) return
      report.value = result
      phase.value = 'done'
    } catch (err) {
      if (mine !== run) return
      error.value = err instanceof Error ? err.message : String(err)
      phase.value = 'failed'
    }
  }

  return { nodeUrl, phase, error, report, submit }
}
