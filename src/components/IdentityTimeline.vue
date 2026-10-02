<script setup lang="ts">
import { AvalonButton, AvalonTextField, AvalonWarningBanner } from '@avalon-initiative/common-ui'
import { watch } from 'vue'
import type { EntriesClient } from '../api/entries'
import { useIdentityTimeline } from '../composables/useIdentityTimeline'
import styles from '../styles/IdentityTimeline.module.scss'
import { shortHash } from '../utils/entryView'
import { describeKind } from '../utils/kindInfo'
import { formatTime } from '../utils/timeView'

const props = withDefaults(defineProps<{ nodeUrl: string; shard?: string; client?: EntriesClient }>(), { shard: 'core' })
const emit = defineEmits<{ open: [target: { shardId: string; seq: number }] }>()
const state = useIdentityTimeline(props.nodeUrl, props.client)
const { identityInput, shardInput, shardId, phase, error, matches, groups, scanned, reachedEnd } = state

watch(() => props.shard, (id) => (shardInput.value = id), { immediate: true })

/** Runs the search for one identity in one shard, as when picked from a name search. */
async function lookup(identityId: string) {
  identityInput.value = identityId
  await state.search()
}
defineExpose({ lookup })
</script>

<template>
  <section :class="styles.timeline" aria-label="Identity timeline" data-testid="identity-timeline">
    <form :class="styles.form" @submit.prevent="state.search()">
      <div :class="styles.field">
        <AvalonTextField v-model="identityInput" label="Identity id" placeholder="identity:... or a uuid" :disabled="phase === 'scanning'" />
      </div>
      <AvalonButton label="Find entries" :disabled="phase === 'scanning'" @click="state.search()" />
    </form>
    <p :class="styles.note">Found by scanning the shard's entries here; the node can only filter by an exact subject. Listed, not individually proven.</p>

    <p v-if="phase === 'idle'" :class="styles.note" data-testid="timeline-idle">Enter an identity id above and press Find entries. You can also open one from the Search tab.</p>
    <AvalonWarningBanner v-else-if="phase === 'failed'" tone="danger" title="Could not build the timeline" :message="error" />
    <p v-else-if="phase === 'scanning'" :class="styles.note">Scanning shard {{ shardId }}: {{ scanned }} entries read, {{ matches.length }} found.</p>
    <template v-else-if="phase === 'done'">
      <p :class="styles.note" data-testid="scan-status">
        {{ matches.length }} entries for this identity in {{ scanned }} scanned.
        <template v-if="reachedEnd">The scan reached the end of shard {{ shardId }}.</template>
        <template v-else>The scan stopped early; older or newer entries may follow.</template>
      </p>
      <AvalonButton v-if="!reachedEnd" label="Keep scanning" variant="secondary" @click="state.continueScan()" />
      <p v-if="matches.length === 0" :class="styles.note" data-testid="timeline-empty">No entry names this identity in what was scanned.</p>
      <section v-for="group in groups" :key="group.kind" :class="styles.group" data-testid="timeline-group">
        <h3 :class="styles.groupTitle">{{ group.kind }} ({{ group.entries.length }})</h3>
        <p :class="styles.note">{{ describeKind(group.kind) }}</p>
        <ul :class="styles.list">
          <li v-for="entry in group.entries" :key="entry.seq" :class="styles.item" data-testid="timeline-entry">
            <button type="button" :class="styles.link" data-testid="timeline-open" @click="emit('open', { shardId, seq: entry.seq })">seq {{ entry.seq }}</button>
            <span :title="entry.event_timestamp">{{ formatTime(entry.event_timestamp) }}</span>
            <span :class="styles.mono" :title="entry.entry_hash">{{ shortHash(entry.entry_hash) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>
