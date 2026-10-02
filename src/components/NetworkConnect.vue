<script setup lang="ts">
import { AvalonSelect, AvalonStatusBadge, AvalonWarningBanner } from '@avalon-initiative/common-ui'
import type { VerifiedCandidate } from '@avalon-initiative/protocol-sdk'
import { computed } from 'vue'
import type { NetworkOption } from '../api/network'
import styles from '../styles/NetworkConnect.module.scss'
import { hostOf, networkChoices, nodeChoices } from '../utils/connectOptions'
import NodeUrlForm from './NodeUrlForm.vue'

const props = defineProps<{
  networks: NetworkOption[]
  loading: boolean
  loadError: string
  selected: string
  connecting: boolean
  connectError: string
  nodes: VerifiedCandidate[]
  currentNode: string
  busy: boolean
  urlError: string
}>()
const nodeUrl = defineModel<string>('nodeUrl', { required: true })
defineEmits<{ connect: [networkId: string]; 'use-node': [url: string]; 'submit-url': [] }>()

const networkOptions = computed(() => networkChoices(props.networks))
const nodeOptions = computed(() => nodeChoices(props.nodes))
</script>

<template>
  <section :class="styles.connect" aria-label="Connect" data-testid="network-connect">
    <div :class="styles.bar">
      <div :class="styles.group">
        <p v-if="loading" :class="styles.note">Loading the published networks.</p>
        <AvalonWarningBanner v-else-if="loadError" tone="warning" title="Could not load the published networks" :message="`${loadError} Enter a node URL below instead.`" />
        <AvalonSelect
          v-else
          :model-value="selected"
          :options="networkOptions"
          label="Network"
          placeholder="Choose a network"
          search-placeholder="Filter networks"
          empty-text="No network matches"
          :disabled="connecting || busy"
          width="22rem"
          data-testid="network-select"
          @update:model-value="$emit('connect', $event)"
        />
        <span v-if="!loading && !loadError && networks.length === 0" :class="styles.hint">No published network lists a node to connect to.</span>
      </div>
      <div v-if="nodes.length" :class="styles.group" title="Nodes publishing a head signed by this network, fastest first" data-testid="node-choices">
        <AvalonSelect
          :model-value="currentNode"
          :options="nodeOptions"
          label="Node"
          placeholder="Choose a node"
          search-placeholder="Filter nodes"
          empty-text="No node matches"
          :disabled="busy"
          width="22rem"
          data-testid="node-select"
          @update:model-value="$emit('use-node', $event)"
        />
      </div>
      <div v-else-if="currentNode" :class="styles.group">
        <span :class="styles.label">Node</span>
        <AvalonStatusBadge :label="hostOf(currentNode)" tone="neutral" data-testid="current-node" />
      </div>
      <slot />
      <details :class="styles.manual">
        <summary>Use a node URL instead</summary>
        <NodeUrlForm v-model:node-url="nodeUrl" :busy="busy" :error="urlError" @submit="$emit('submit-url')" />
      </details>
    </div>
    <p v-if="connecting" :class="styles.note" data-testid="connecting">Looking for a node that verifies as {{ selected }}.</p>
    <AvalonWarningBanner v-if="connectError" tone="danger" title="Could not connect to the network" :message="connectError" />
  </section>
</template>
