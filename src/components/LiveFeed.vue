<script setup lang="ts">
import { AvalonButton, AvalonDrawer, AvalonMultiSelect, AvalonStatusBadge, AvalonTextField, AvalonWarningBanner } from '@avalon-initiative/common-ui'
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import type { LedgerEntry } from '../api/entries'
import EntryDetail from './EntryDetail.vue'
import { useLiveFeed } from '../composables/useLiveFeed'
import type { LiveFeedDeps } from '../composables/useLiveFeed'
import styles from '../styles/LiveFeed.module.scss'
import { shortHash } from '../utils/entryView'
import { describeKind } from '../utils/kindInfo'
import { formatTime } from '../utils/timeView'
import { verdict } from '../utils/sthView'

const props = withDefaults(defineProps<{ nodeUrl: string; shard?: string; deps?: LiveFeedDeps }>(), { shard: 'core' })
const emit = defineEmits<{ 'open-entry': [target: { shardId: string; seq: number }] }>()
const state = useLiveFeed(props.nodeUrl, props.deps)
// The entry itself is kept, so the drawer stays put after the feed's cap drops it from the list.
const inspected = shallowRef<LedgerEntry | null>(null)
const { shardInput, shardId, followInput, followInvalid, selectedKinds, phase, error, feed, visible, kinds, head, broken } = state
onBeforeUnmount(state.stop)
watch(
  () => props.shard,
  (id) => {
    shardInput.value = id
    inspected.value = null
    if (phase.value !== 'idle') void state.start()
  },
  { immediate: true },
)
</script>

<template>
  <section :class="styles.feed" aria-label="Live feed" data-testid="live-feed">
    <div :class="styles.main">
      <form :class="styles.form" @submit.prevent="state.start()">
        <AvalonButton :label="phase === 'idle' || phase === 'failed' ? 'Start feed' : 'Restart feed'" :disabled="phase === 'starting'" @click="state.start()" />
        <AvalonButton v-if="phase === 'running'" label="Pause" variant="secondary" @click="state.pause()" />
        <AvalonButton v-if="phase === 'paused'" label="Resume" variant="secondary" @click="state.resume()" />
      </form>

      <AvalonWarningBanner v-if="phase === 'failed'" tone="danger" title="The feed stopped" :message="error" />
      <template v-if="phase !== 'idle'">
        <p :class="styles.note" data-testid="feed-state">
          Shard {{ shardId }}: {{ phase === 'starting' ? 'verifying the head' : phase === 'running' ? 'following new entries' : phase === 'paused' ? 'paused' : 'stopped' }}.
          <AvalonStatusBadge v-if="head" :label="verdict(head).label" :tone="verdict(head).tone" data-testid="feed-verdict" />
        </p>
        <AvalonWarningBanner v-if="broken" tone="danger" title="Entries do not extend each other" :message="`The entry at seq ${broken.atSeq} does not follow the one before it (sequence or prev_hash).`" data-testid="feed-broken" />
        <p :class="styles.note">Listed, not individually proven. A consistency check between heads needs SDK proof support and is not made yet.</p>
        <div :class="styles.toolbar">
          <AvalonMultiSelect v-model="selectedKinds" :options="kinds" label="Kind" />
          <div :class="styles.field">
            <AvalonTextField v-model="followInput" label="Follow identity" placeholder="identity:... or a uuid" />
          </div>
        </div>
        <p v-if="followInvalid" :class="styles.note" data-testid="follow-invalid">Not an identity id; showing every entry.</p>
        <p v-if="feed.length === 0 && phase !== 'starting'" :class="styles.note" data-testid="feed-empty">Nothing yet.</p>
        <p v-else-if="visible.length === 0 && feed.length > 0" :class="styles.note">No entry in the feed matches the filter.</p>
        <ul :class="styles.list">
          <li v-for="entry in visible" :key="entry.seq" data-testid="feed-entry">
            <button type="button" :class="[styles.item, inspected?.seq === entry.seq && styles.chosen]" :aria-pressed="inspected?.seq === entry.seq" data-testid="feed-open" @click="inspected = entry">
              <span :class="styles.mono">seq {{ entry.seq }}</span>
              <strong :title="describeKind(entry.kind)">{{ entry.kind }}</strong>
              <span :class="styles.wrap">{{ entry.subject }}</span>
              <span :title="entry.event_timestamp">{{ formatTime(entry.event_timestamp) }}</span>
              <span :class="styles.mono" :title="entry.entry_hash">{{ shortHash(entry.entry_hash) }}</span>
            </button>
          </li>
        </ul>
      </template>
    </div>
    <AvalonDrawer :open="inspected !== null" :title="inspected ? `Entry ${inspected.seq}: ${inspected.kind}` : ''" close-label="Close entry" :class="styles.drawer" data-testid="feed-drawer" @close="inspected = null">
      <template v-if="inspected">
        <EntryDetail :entry="inspected" />
        <AvalonButton label="Open in chain view" variant="secondary" data-testid="feed-open-chain" @click="emit('open-entry', { shardId, seq: inspected.seq })" />
      </template>
    </AvalonDrawer>
  </section>
</template>
