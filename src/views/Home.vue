<script setup lang="ts">
import { AvalonButton, AvalonStatusBadge, AvalonTabs, AvalonTextField } from '@avalon-initiative/common-ui'
import { onMounted, ref, watch } from 'vue'
import IdentityTimeline from '../components/IdentityTimeline.vue'
import LiveFeed from '../components/LiveFeed.vue'
import NameSearch from '../components/NameSearch.vue'
import NetworkConnect from '../components/NetworkConnect.vue'
import ShardEntries from '../components/ShardEntries.vue'
import SthReport from '../components/SthReport.vue'
import { useConnection } from '../composables/useConnection'
import styles from '../styles/Home.module.scss'
import { verdict } from '../utils/sthView'

const shardEntries = ref<InstanceType<typeof ShardEntries> | null>(null)
const timeline = ref<InstanceType<typeof IdentityTimeline> | null>(null)
const TABS = [
  { id: 'head', label: 'Head' },
  { id: 'browse', label: 'Browse' },
  { id: 'search', label: 'Search' },
  { id: 'identity', label: 'Identity' },
  { id: 'live', label: 'Live' },
]
const tab = ref('browse')
const shard = ref('core')
const shardInput = ref('core')
const c = useConnection()
const { nodeUrl, phase, error, report, networks, networksPhase, networksError, selectedNetwork, connecting, connectError, nodes } = c
onMounted(c.loadList)
// A new node starts on the entries again, whatever tab the last one was left on.
watch(report, (next, prev) => {
  if (next?.nodeUrl !== prev?.nodeUrl) tab.value = 'browse'
})

function setShard() {
  shard.value = shardInput.value.trim() || 'core'
  shardInput.value = shard.value
}

async function showTimeline(identityId: string) {
  tab.value = 'identity'
  await timeline.value?.lookup(identityId)
}

async function openEntry({ shardId, seq }: { shardId: string; seq: number }) {
  tab.value = 'browse'
  await shardEntries.value?.jumpTo(shardId, seq)
}
</script>

<template>
  <main :class="styles.page">
    <h1 :class="styles.title">Avalon ledger explorer</h1>
    <p :class="styles.lede">
      Pick a network, or enter a node, and this page checks its latest tree head itself: the author signature, the witness cosignatures and the trust anchor.
      Nothing the node says about itself is trusted.
    </p>
    <NetworkConnect
      v-model:node-url="nodeUrl"
      :networks="networks"
      :loading="networksPhase === 'loading'"
      :load-error="networksError"
      :selected="selectedNetwork"
      :connecting="connecting"
      :connect-error="connectError"
      :nodes="nodes"
      :current-node="report?.nodeUrl ?? ''"
      :busy="phase === 'verifying'"
      :url-error="error"
      @connect="c.connect"
      @use-node="c.useNode"
      @submit-url="c.submitUrl"
    />
    <template v-if="report">
      <form :class="styles.bar" data-testid="shard-form" @submit.prevent="setShard">
        <AvalonStatusBadge :label="verdict(report).label" :tone="verdict(report).tone" data-testid="header-verdict" />
        <div :class="styles.shard">
          <AvalonTextField v-model="shardInput" label="Shard id" placeholder="core" />
        </div>
        <AvalonButton label="Set shard" variant="secondary" @click="setShard" />
      </form>
      <AvalonTabs v-model="tab" :tabs="TABS" label="Explorer views" :class="styles.tabs">
        <template #head><SthReport :report="report" /></template>
        <template #browse><ShardEntries ref="shardEntries" :key="report.nodeUrl" :node-url="report.nodeUrl" :shard="shard" /></template>
        <template #search>
          <NameSearch :key="report.nodeUrl" :node-url="report.nodeUrl" :shard="shard" @timeline="showTimeline" />
        </template>
        <template #identity>
          <IdentityTimeline ref="timeline" :key="report.nodeUrl" :node-url="report.nodeUrl" :shard="shard" @open="openEntry" />
        </template>
        <template #live><LiveFeed :key="report.nodeUrl" :node-url="report.nodeUrl" :shard="shard" /></template>
      </AvalonTabs>
    </template>
  </main>
</template>
