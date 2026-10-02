<script setup lang="ts">
import { AvalonCard, AvalonDetailList, AvalonStatusBadge, AvalonWarningBanner } from '@avalon-initiative/common-ui'
import { computed } from 'vue'
import styles from '../styles/SthReport.module.scss'
import type { SthReport } from '../utils/sthReport'
import { checkLabel, checkTone, headItems, verdict } from '../utils/sthView'

const props = defineProps<{ report: SthReport }>()
const result = computed(() => verdict(props.report))
const items = computed(() => headItems(props.report))
</script>

<template>
  <section :class="styles.report" aria-label="Verification result" data-testid="sth-report">
    <AvalonWarningBanner v-if="report.error" tone="danger" title="Verification could not run" :message="report.error" />
    <AvalonCard :title="report.nodeUrl" subtitle="Latest signed tree head">
      <template #action>
        <AvalonStatusBadge :label="result.label" :tone="result.tone" data-testid="verdict" />
      </template>
      <ul :class="styles.checks">
        <li v-for="check in report.checks" :key="check.id" :class="styles.check" :data-testid="`check-${check.id}`">
          <AvalonStatusBadge :label="checkLabel(check.status)" :tone="checkTone(check.status)" />
          <div>
            <p :class="styles.name">{{ check.label }}</p>
            <p :class="styles.detail">{{ check.detail }}</p>
          </div>
        </li>
      </ul>
    </AvalonCard>
    <AvalonDetailList v-if="items.length" :items="items" title="Tree head" label="Tree head fields" />
  </section>
</template>
