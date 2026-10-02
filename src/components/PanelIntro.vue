<script setup lang="ts">
import styles from '../styles/PanelIntro.module.scss'

defineProps<{ title: string; text: string }>()
</script>

<template>
  <header :class="styles.intro">
    <h2 :class="styles.title">{{ title }}</h2>
    <p :class="styles.text">{{ text }}</p>
  </header>
</template>
