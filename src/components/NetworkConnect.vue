<script setup lang="ts">
import { AvalonButton, AvalonStatusBadge, AvalonWarningBanner } from '@avalon-initiative/common-ui'
import type { VerifiedCandidate } from '@avalon-initiative/protocol-sdk'
import type { NetworkOption } from '../api/network'
import styles from '../styles/NetworkConnect.module.scss'
import NodeUrlForm from './NodeUrlForm.vue'

defineProps<{
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

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
</script>

<template>
  <section :class="styles.connect" aria-label="Connect" data-testid="network-connect">
    <div :class="styles.bar">
      <div :class="styles.group">
        <span :class="styles.label" id="network-label">Network</span>
        <p v-if="loading" :class="styles.note">Loading the published networks.</p>
        <AvalonWarningBanner v-else-if="loadError" tone="warning" title="Could not load the published networks" :message="`${loadError} Enter a node URL below instead.`" />
        <div v-else :class="styles.choices" role="group" aria-labelledby="network-label">
          <AvalonButton
            v-for="network in networks"
            :key="network.networkId"
            :label="network.networkId"
            :variant="selected === network.networkId ? 'primary' : 'secondary'"
            :disabled="connecting || busy"
            data-testid="network-button"
            @click="$emit('connect', network.networkId)"
          />
          <p v-if="networks.length === 0" :class="styles.note">No published network lists a node to connect to.</p>
        </div>
      </div>
      <div v-if="nodes.length > 1" :class="styles.group" data-testid="node-choices">
        <span :class="styles.label" id="node-label">Node</span>
        <div :class="styles.choices" role="group" aria-labelledby="node-label">
          <AvalonButton
            v-for="node in nodes"
            :key="node.serverUrl"
            :label="`${hostOf(node.serverUrl)}${node.latencyMs === null ? '' : ` (${Math.round(node.latencyMs)} ms)`}`"
            :variant="node.serverUrl === currentNode ? 'primary' : 'secondary'"
            :disabled="busy"
            data-testid="node-choice"
            @click="$emit('use-node', node.serverUrl)"
          />
        </div>
      </div>
      <div v-else-if="currentNode" :class="styles.group">
        <span :class="styles.label">Node</span>
        <AvalonStatusBadge :label="hostOf(currentNode)" tone="neutral" data-testid="current-node" />
      </div>
      <slot />
    </div>
    <p v-if="connecting" :class="styles.note" data-testid="connecting">Looking for a node that verifies as {{ selected }}.</p>
    <AvalonWarningBanner v-if="connectError" tone="danger" title="Could not connect to the network" :message="connectError" />
    <details :class="styles.manual">
      <summary>Use a node URL instead</summary>
      <NodeUrlForm v-model:node-url="nodeUrl" :busy="busy" :error="urlError" @submit="$emit('submit-url')" />
    </details>
  </section>
</template>
