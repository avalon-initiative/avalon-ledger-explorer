<script setup lang="ts">
import { AvalonButton } from '@avalon-initiative/common-ui'
import styles from '../styles/ViewToggle.module.scss'

defineProps<{ view: 'chain' | 'list' }>()
defineEmits<{ select: [view: 'chain' | 'list'] }>()
</script>

<template>
  <div :class="styles.toggle" role="group" aria-label="Browse as">
    <AvalonButton label="Chain" :variant="view === 'chain' ? 'primary' : 'secondary'" data-testid="view-chain" @click="$emit('select', 'chain')" />
    <AvalonButton label="List" :variant="view === 'list' ? 'primary' : 'secondary'" data-testid="view-list" @click="$emit('select', 'list')" />
  </div>
</template>
