<script setup lang="ts">
import { AvalonButton, AvalonTabs, AvalonTextField } from '@avalon-initiative/common-ui'
import { onMounted, ref, watch } from 'vue'
import BrowsePanel from '../components/BrowsePanel.vue'
import HeadSummary from '../components/HeadSummary.vue'
import IdentityTimeline from '../components/IdentityTimeline.vue'
import LiveFeed from '../components/LiveFeed.vue'
import NameSearch from '../components/NameSearch.vue'
import PanelIntro from '../components/PanelIntro.vue'
import NetworkConnect from '../components/NetworkConnect.vue'
import WelcomePanel from '../components/WelcomePanel.vue'
import SthReport from '../components/SthReport.vue'
import { useConnection } from '../composables/useConnection'
import styles from '../styles/Home.module.scss'

const browse = ref<InstanceType<typeof BrowsePanel> | null>(null)
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

async function openEntry({ seq }: { shardId: string; seq: number }) {
  tab.value = 'browse'
  await browse.value?.showEntry(seq)
}
</script>

<template>
  <main :class="styles.page">
    <h1 :class="styles.title">Avalon ledger explorer</h1>
    <p :class="styles.lede">Look through an Avalon network's ledger and check it for yourself. Nothing a node says about itself is taken on trust.</p>
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
>
      <div v-if="report" :class="styles.shardGroup">
        <form :class="styles.shardForm" data-testid="shard-form" @submit.prevent="setShard">
          <div :class="styles.shard">
            <AvalonTextField v-model="shardInput" label="Shard" placeholder="core" />
          </div>
          <AvalonButton label="Set shard" variant="secondary" @click="setShard" />
        </form>
        <span :class="styles.hint">A shard is one independent ledger; most networks use core</span>
      </div>
    </NetworkConnect>
    <WelcomePanel v-if="!report" />
    <template v-else>
      <HeadSummary :report="report" @details="tab = 'head'" />
      <AvalonTabs v-model="tab" :tabs="TABS" size="lg" label="Explorer views" :class="styles.tabs">
        <template #head>
          <PanelIntro :class="styles.intro" title="The signed head" text="The network operator signs a tree head: a short fingerprint of the whole ledger. Independent witnesses cosign it. These are the checks this page ran on the node." />
          <SthReport :report="report" />
        </template>
        <template #browse>
          <PanelIntro :class="styles.intro" title="Browse the ledger" text="Step through entries one at a time. Each entry holds the hash of the one before it, so a changed or missing entry breaks the link. Use the arrow keys or jump to any position." />
          <BrowsePanel ref="browse" :key="report.nodeUrl" :node-url="report.nodeUrl" :shard="shard" />
        </template>
        <template #search>
          <PanelIntro :class="styles.intro" title="Find an identity by name" text="Search display names. Names are not unique on the ledger, so you get candidates; open one to see everything that identity did." />
          <NameSearch :key="report.nodeUrl" :node-url="report.nodeUrl" :shard="shard" @timeline="showTimeline" />
        </template>
        <template #identity>
          <PanelIntro :class="styles.intro" title="Follow one identity" text="Everything one identity has done, grouped by what happened. Paste an identity id, or pick one from a search." />
          <IdentityTimeline ref="timeline" :key="report.nodeUrl" :node-url="report.nodeUrl" :shard="shard" @open="openEntry" />
        </template>
        <template #live>
          <PanelIntro :class="styles.intro" title="Watch new entries arrive" text="Start the feed to see entries as they are added, newest first. Pause any time, filter by kind, or follow one identity." />
          <LiveFeed :key="report.nodeUrl" :node-url="report.nodeUrl" :shard="shard" />
        </template>
      </AvalonTabs>
    </template>
  </main>
</template>
