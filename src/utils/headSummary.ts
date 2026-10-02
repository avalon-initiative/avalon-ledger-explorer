import type { SthReport } from './sthReport'

export interface HeadSummary {
  headline: string
  detail: string
}

/** What the verdict means in plain words, with the reason when it is not a clean pass. */
export function headSummary(report: SthReport): HeadSummary {
  if (report.error) return { headline: 'This node could not be checked', detail: report.error }
  const failed = report.checks.find((c) => c.status === 'fail')
  if (!report.verified || failed) {
    return { headline: 'This node’s ledger head did not pass the check', detail: failed ? `${failed.label}: ${failed.detail}` : 'The tree head could not be verified.' }
  }
  const size = report.head?.sth.tree_size
  const entries = size === undefined ? '' : ` It covers ${size} ${size === 1 ? 'entry' : 'entries'}.`
  const cos = report.cosignatures
  if (report.checks.some((c) => c.status === 'skipped') || !cos) {
    return { headline: 'Signed by the network operator', detail: `The author signature checks out against the published key; witness cosignatures were not checked.${entries}` }
  }
  return {
    headline: 'Signed by the network and witnessed',
    detail: `The author signature checks out and ${cos.valid} independent witnesses (${cos.required} needed) vouch for the same ledger head.${entries}`,
  }
}
