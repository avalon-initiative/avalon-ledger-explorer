import type { AvalonDetailListItem, AvalonStatusTone } from '@avalon-initiative/common-ui'
import type { CheckStatus, SthReport } from './sthReport'

const TONES: Record<CheckStatus, AvalonStatusTone> = { pass: 'success', fail: 'danger', skipped: 'warning' }
const LABELS: Record<CheckStatus, string> = { pass: 'Passed', fail: 'Failed', skipped: 'Not checked' }

export function checkTone(status: CheckStatus): AvalonStatusTone {
  return TONES[status]
}

export function checkLabel(status: CheckStatus): string {
  return LABELS[status]
}

/** One headline for the whole report, in words; a partial check never reads as a clean pass. */
export function verdict(report: SthReport): { label: string; tone: AvalonStatusTone } {
  if (report.error) return { label: 'Not verified', tone: 'danger' }
  if (!report.verified) return { label: 'Not verified', tone: 'danger' }
  const partial = report.checks.some((c) => c.status === 'skipped')
  return partial ? { label: 'Verified (author signature only)', tone: 'warning' } : { label: 'Verified', tone: 'success' }
}

/** The head's own fields, as served. */
export function headItems(report: SthReport): AvalonDetailListItem[] {
  const sth = report.head?.sth
  if (!sth) return []
  return [
    { label: 'Network', value: sth.network_id },
    { label: 'Tree size', value: String(sth.tree_size), mono: true },
    { label: 'Root hash', value: sth.root_hash, mono: true, block: true },
    { label: 'Created', value: sth.created_at, mono: true },
    { label: 'Signing key id', value: sth.signing_key_id, mono: true },
    { label: 'Cosignatures served', value: String(report.head?.cosignatures.length ?? 0) },
    { label: 'Trust anchors', value: report.anchorSource, mono: true },
  ]
}
