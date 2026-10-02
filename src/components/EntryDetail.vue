<script setup lang="ts">
import type { LedgerEntry } from '../api/entries'
import styles from '../styles/EntryDetail.module.scss'
import { payloadText } from '../utils/entryView'
import { describeKind } from '../utils/kindInfo'
import { formatTime } from '../utils/timeView'

defineProps<{ entry: LedgerEntry }>()
</script>

<template>
  <div :class="styles.detail">
    <p :class="styles.meaning" data-testid="entry-meaning">{{ describeKind(entry.kind) }}</p>
    <div :class="styles.body">
      <dl :class="styles.fields">
        <dt>Subject</dt>
        <dd>{{ entry.subject }}</dd>
        <dt>Issuer</dt>
        <dd>{{ entry.issuer }}</dd>
        <dt>Time</dt>
        <dd :title="entry.event_timestamp">{{ formatTime(entry.event_timestamp) }}</dd>
        <dt>Entry hash</dt>
        <dd :class="styles.mono">{{ entry.entry_hash }}</dd>
        <dt>Previous hash</dt>
        <dd :class="styles.mono">{{ entry.prev_hash }}</dd>
      </dl>
      <pre :class="styles.payload" data-testid="entry-payload">{{ payloadText(entry) }}</pre>
    </div>
  </div>
</template>
