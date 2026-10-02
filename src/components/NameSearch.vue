<script setup lang="ts">
import { AvalonButton, AvalonTextField, AvalonWarningBanner } from '@avalon-initiative/common-ui'
import type { EntriesClient } from '../api/entries'
import { useNameSearch } from '../composables/useNameSearch'
import styles from '../styles/NameSearch.module.scss'

const props = defineProps<{ nodeUrl: string; client?: EntriesClient }>()
const emit = defineEmits<{ timeline: [target: { shardId: string; identityId: string }] }>()
const state = useNameSearch(props.nodeUrl, props.client)
const { queryInput, shardInput, shardId, phase, error, candidates, searched, scanned, reachedEnd } = state
</script>

<template>
  <section :class="styles.search" aria-label="Display name search" data-testid="name-search">
    <h2 :class="styles.heading">Find an identity by display name</h2>
    <form :class="styles.form" @submit.prevent="state.search()">
      <div :class="styles.field">
        <AvalonTextField v-model="queryInput" label="Display name" placeholder="part of a name" :disabled="phase === 'scanning'" />
      </div>
      <div :class="styles.field">
        <AvalonTextField v-model="shardInput" label="Shard id" placeholder="core" :disabled="phase === 'scanning'" />
      </div>
      <AvalonButton label="Search names" :disabled="phase === 'scanning'" @click="state.search()" />
    </form>
    <p :class="styles.note">
      Scans the identity.created entries of this shard. Names are not unique on the ledger and nodes project them independently, so these are candidates keyed by identity id, not a verified lookup.
    </p>

    <AvalonWarningBanner v-if="phase === 'failed'" tone="danger" title="Could not search names" :message="error" />
    <p v-else-if="phase === 'scanning'" :class="styles.note">Scanning shard {{ shardId }}: {{ scanned }} entries read, {{ candidates.length }} found.</p>
    <template v-else-if="phase === 'done'">
      <p :class="styles.note" data-testid="name-status">
        {{ candidates.length }} candidates for "{{ searched }}" in {{ scanned }} scanned.
        <template v-if="reachedEnd">The scan reached the end of shard {{ shardId }}.</template>
        <template v-else>The scan stopped early; more may follow.</template>
      </p>
      <AvalonButton v-if="!reachedEnd" label="Keep scanning" variant="secondary" @click="state.continueScan()" />
      <ul v-if="candidates.length" :class="styles.list">
        <li v-for="c in candidates" :key="c.seq" :class="styles.item" data-testid="name-candidate">
          <strong>{{ c.displayName }}</strong>
          <span :class="styles.mono">{{ c.identityId }}</span>
          <span :class="styles.mono">seq {{ c.seq }}</span>
          <span v-if="c.sameNameAs > 0" :class="styles.dup" data-testid="name-duplicate">Same name as {{ c.sameNameAs }} other {{ c.sameNameAs === 1 ? 'candidate' : 'candidates' }}</span>
          <button type="button" :class="styles.link" data-testid="name-timeline" @click="emit('timeline', { shardId, identityId: c.identityId })">Show timeline</button>
        </li>
      </ul>
    </template>
  </section>
</template>
