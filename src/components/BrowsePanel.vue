<script setup lang="ts">
import { ref } from 'vue'
import styles from '../styles/BrowsePanel.module.scss'
import ChainView from './ChainView.vue'
import ShardEntries from './ShardEntries.vue'
import ViewToggle from './ViewToggle.vue'

withDefaults(defineProps<{ nodeUrl: string; shard?: string }>(), { shard: 'core' })
const view = ref<'chain' | 'list'>('chain')
const chain = ref<InstanceType<typeof ChainView> | null>(null)
const list = ref<InstanceType<typeof ShardEntries> | null>(null)

/** Shows one entry in the chain view, centered between its neighbours. */
async function showEntry(seq: number) {
  view.value = 'chain'
  await chain.value?.goTo(seq)
}

async function showInList({ shardId, seq }: { shardId: string; seq: number }) {
  view.value = 'list'
  await list.value?.jumpTo(shardId, seq)
}

defineExpose({ showEntry })
</script>

<template>
  <section :class="styles.browse" aria-label="Browse the ledger">
    <ChainView v-show="view === 'chain'" ref="chain" :node-url="nodeUrl" :shard="shard" @show-in-list="showInList">
      <template #lead><ViewToggle :view="view" @select="view = $event" /></template>
    </ChainView>
    <div v-show="view === 'list'" :class="styles.list">
      <ViewToggle :view="view" @select="view = $event" />
      <ShardEntries ref="list" :node-url="nodeUrl" :shard="shard" />
    </div>
  </section>
</template>
