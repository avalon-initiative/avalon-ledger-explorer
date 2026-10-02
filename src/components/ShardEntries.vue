<script setup lang="ts">
import { AvalonButton, AvalonCard, AvalonMultiSelect, AvalonStatusBadge, AvalonTextField, AvalonWarningBanner } from '@avalon-initiative/common-ui'
import { onMounted } from 'vue'
import { useShardEntries } from '../composables/useShardEntries'
import type { ShardEntriesDeps } from '../composables/useShardEntries'
import styles from '../styles/ShardEntries.module.scss'
import { continuityLabel, payloadText, shortHash } from '../utils/entryView'
import { verdict } from '../utils/sthView'

const props = defineProps<{ nodeUrl: string; deps?: ShardEntriesDeps }>()
const state = useShardEntries(props.nodeUrl, props.deps)
const { shardInput, shardId, phase, error, head, selectedKinds, expanded, hasPrevious, hasNext, visible, kinds, continuity, entries, sinceSeq } = state
onMounted(() => state.load())
defineExpose({ jumpTo: state.jumpTo })
</script>

<template>
  <section :class="styles.entries" aria-label="Shard entries" data-testid="shard-entries">
    <form :class="styles.shardForm" @submit.prevent="state.load()">
      <div :class="styles.shardField">
        <AvalonTextField v-model="shardInput" label="Shard id" placeholder="core" :disabled="phase === 'loading'" />
      </div>
      <AvalonButton label="List entries" :disabled="phase === 'loading'" @click="state.load()" />
    </form>

    <AvalonCard :title="`Shard ${shardId}`" subtitle="Latest signed tree head of this shard">
      <template #action>
        <AvalonStatusBadge v-if="head" :label="verdict(head).label" :tone="verdict(head).tone" data-testid="shard-verdict" />
        <AvalonStatusBadge v-else label="Verifying" tone="warning" />
      </template>
      <p v-if="head?.error" :class="styles.note">{{ head.error }}</p>
      <p :class="styles.note" data-testid="not-proven">Listed, not individually proven: entries are shown as the node served them, with no inclusion proof checked.</p>
      <AvalonStatusBadge v-if="phase === 'done'" v-bind="continuityLabel(continuity)" data-testid="continuity" />
    </AvalonCard>

    <AvalonWarningBanner v-if="phase === 'failed'" tone="danger" title="Could not list entries" :message="error" />
    <p v-else-if="phase === 'loading'" :class="styles.note">Loading entries.</p>
    <template v-else-if="phase === 'done'">
      <p v-if="entries.length === 0" :class="styles.note" data-testid="empty">
        {{ sinceSeq === 0 ? `No entries: shard ${shardId} is empty or this node does not hold it.` : 'No entries after this point.' }}
      </p>
      <template v-else>
        <div :class="styles.toolbar">
          <AvalonMultiSelect v-model="selectedKinds" :options="kinds" label="Kind" />
          <span :class="styles.note" data-testid="range">Entries after seq {{ sinceSeq }}: showing {{ visible.length }} of {{ entries.length }}</span>
          <AvalonButton label="Previous" variant="secondary" :disabled="!hasPrevious" @click="state.previous()" />
          <AvalonButton label="Next" variant="secondary" :disabled="!hasNext" @click="state.next()" />
        </div>
        <p v-if="visible.length === 0" :class="styles.note">No loaded entry matches the selected kinds.</p>
        <table v-else :class="styles.table">
          <thead>
            <tr>
              <th>Seq</th>
              <th>Kind</th>
              <th>Subject</th>
              <th>Issuer</th>
              <th>Time</th>
              <th>Hash</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="entry in visible" :key="entry.seq">
              <tr :class="styles.row" data-testid="entry-row">
                <td :class="styles.mono">
                  <button type="button" :class="styles.toggle" data-testid="entry-toggle" :aria-expanded="expanded.includes(entry.seq)" @click="state.toggle(entry.seq)">{{ entry.seq }}</button>
                </td>
                <td>{{ entry.kind }}</td>
                <td :class="styles.wrap">{{ entry.subject }}</td>
                <td :class="styles.wrap">{{ entry.issuer }}</td>
                <td :class="styles.mono">{{ entry.event_timestamp }}</td>
                <td :class="styles.mono" :title="entry.entry_hash">{{ shortHash(entry.entry_hash) }}</td>
              </tr>
              <tr v-if="expanded.includes(entry.seq)" data-testid="entry-payload">
                <td colspan="6"><pre :class="styles.payload">{{ payloadText(entry) }}</pre></td>
              </tr>
            </template>
          </tbody>
        </table>
      </template>
    </template>
  </section>
</template>
