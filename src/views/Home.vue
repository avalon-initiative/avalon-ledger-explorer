<script setup lang="ts">
import NodeUrlForm from '../components/NodeUrlForm.vue'
import SthReport from '../components/SthReport.vue'
import { useSthVerification } from '../composables/useSthVerification'
import styles from '../styles/Home.module.scss'

const { nodeUrl, phase, error, report, submit } = useSthVerification()
</script>

<template>
  <main :class="styles.page">
    <h1 :class="styles.title">Avalon ledger explorer</h1>
    <p :class="styles.lede">
      Enter a node and this page checks its latest tree head itself: the author signature, the witness cosignatures and the trust anchor.
      Nothing the node says about itself is trusted.
    </p>
    <NodeUrlForm v-model:node-url="nodeUrl" :busy="phase === 'verifying'" :error="error" @submit="submit" />
    <SthReport v-if="report" :report="report" />
  </main>
</template>
