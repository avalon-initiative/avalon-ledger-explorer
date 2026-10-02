<script setup lang="ts">
import { onMounted, ref } from 'vue'
import IdentityTimeline from '../components/IdentityTimeline.vue'
import LiveFeed from '../components/LiveFeed.vue'
import NameSearch from '../components/NameSearch.vue'
import NetworkConnect from '../components/NetworkConnect.vue'
import ShardEntries from '../components/ShardEntries.vue'
import SthReport from '../components/SthReport.vue'
import { useConnection } from '../composables/useConnection'
import styles from '../styles/Home.module.scss'

const shardEntries = ref<InstanceType<typeof ShardEntries> | null>(null)
const timeline = ref<InstanceType<typeof IdentityTimeline> | null>(null)
const c = useConnection()
const { nodeUrl, phase, error, report, networks, networksPhase, networksError, selectedNetwork, connecting, connectError, nodes } = c
onMounted(c.loadList)
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
    <SthReport v-if="report" :report="report" />
    <NameSearch v-if="report" :key="`names-${report.nodeUrl}`" :node-url="report.nodeUrl" @timeline="({ shardId, identityId }) => timeline?.lookup(shardId, identityId)" />
    <IdentityTimeline v-if="report" ref="timeline" :key="`timeline-${report.nodeUrl}`" :node-url="report.nodeUrl" @open="({ shardId, seq }) => shardEntries?.jumpTo(shardId, seq)" />
    <LiveFeed v-if="report" :key="`feed-${report.nodeUrl}`" :node-url="report.nodeUrl" />
    <ShardEntries v-if="report" ref="shardEntries" :key="report.nodeUrl" :node-url="report.nodeUrl" />
  </main>
</template>
