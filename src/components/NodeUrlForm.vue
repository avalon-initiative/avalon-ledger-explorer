<script setup lang="ts">
import { AvalonButton, AvalonTextField } from '@avalon-initiative/common-ui'
import styles from '../styles/NodeUrlForm.module.scss'

defineProps<{ busy: boolean; error: string }>()
const nodeUrl = defineModel<string>('nodeUrl', { required: true })
defineEmits<{ submit: [] }>()
</script>

<template>
  <form :class="styles.form" @submit.prevent="$emit('submit')">
    <div :class="styles.field">
      <AvalonTextField v-model="nodeUrl" label="Node URL" placeholder="http://192.168.7.113:8080" :error="error" :disabled="busy" />
    </div>
    <AvalonButton :label="busy ? 'Verifying' : 'Verify latest tree head'" :disabled="busy" @click="$emit('submit')" />
  </form>
</template>
