<script setup lang="ts">
import { AvalonButton, AvalonStatusBadge } from '@avalon-initiative/common-ui'
import { computed } from 'vue'
import styles from '../styles/HeadSummary.module.scss'
import { headSummary } from '../utils/headSummary'
import type { SthReport } from '../utils/sthReport'
import { verdict } from '../utils/sthView'

const props = defineProps<{ report: SthReport }>()
defineEmits<{ details: [] }>()
const result = computed(() => verdict(props.report))
const summary = computed(() => headSummary(props.report))
</script>

<template>
  <section :class="[styles.summary, styles[result.tone]]" aria-label="Verification summary" data-testid="head-summary">
    <AvalonStatusBadge :label="result.label" :tone="result.tone" :class="styles.badge" data-testid="header-verdict" />
    <div :class="styles.words">
      <p :class="styles.headline">{{ summary.headline }}</p>
      <p :class="styles.detail">{{ summary.detail }}</p>
    </div>
    <AvalonButton label="See the checks" variant="secondary" @click="$emit('details')" />
  </section>
</template>
