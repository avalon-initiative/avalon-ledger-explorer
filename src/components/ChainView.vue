<script setup lang="ts">
import { AvalonButton, AvalonStatusBadge, AvalonTextField, AvalonWarningBanner } from '@avalon-initiative/common-ui'
import { onMounted, watch } from 'vue'
import { useChainNavigator } from '../composables/useChainNavigator'
import type { ChainDeps } from '../composables/useChainNavigator'
import styles from '../styles/ChainView.module.scss'
import { linkLabel } from '../utils/chainLinks'
import { payloadText, shortHash } from '../utils/entryView'
import { describeKind } from '../utils/kindInfo'
import { formatTime } from '../utils/timeView'

const props = withDefaults(defineProps<{ nodeUrl: string; shard?: string; deps?: ChainDeps }>(), { shard: 'core' })
const emit = defineEmits<{ 'show-in-list': [target: { shardId: string; seq: number }] }>()
const state = useChainNavigator(props.nodeUrl, props.deps)
const { shardId, phase, error, seq, latest, seqInput, window, before, after, canStep } = state
state.shardInput.value = props.shard
onMounted(() => state.open())
watch(
  () => props.shard,
  (id) => {
    state.shardInput.value = id
    void state.open()
  },
)

function onKey(event: KeyboardEvent) {
  if ((event.target as HTMLElement).tagName === 'INPUT') return
  if (event.key === 'ArrowLeft' && canStep.value.back) void state.step(-1)
  else if (event.key === 'ArrowRight' && canStep.value.forward) void state.step(1)
  else return
  event.preventDefault()
}

defineExpose({ goTo: state.goTo })
</script>

<template>
  <section :class="styles.chain" aria-label="Chain view" data-testid="chain-view" tabindex="0" @keydown="onKey">
    <div :class="styles.controls">
      <slot name="lead" />
      <AvalonButton label="First" variant="secondary" :disabled="phase === 'loading' || seq === 1" @click="state.goTo(1)" />
      <AvalonButton label="Previous" variant="secondary" :disabled="phase === 'loading' || !canStep.back" @click="state.step(-1)" />
      <AvalonButton label="Next" variant="secondary" :disabled="phase === 'loading' || !canStep.forward" @click="state.step(1)" />
      <AvalonButton label="Latest" variant="secondary" :disabled="phase === 'loading' || latest === 0 || seq === latest" @click="state.goTo(latest)" />
      <form :class="styles.jump" @submit.prevent="state.goToInput()">
        <AvalonTextField v-model="seqInput" label="Seq" placeholder="seq" :disabled="phase === 'loading'" />
        <AvalonButton label="Go" @click="state.goToInput()" />
      </form>
      <input
        v-if="latest > 1"
        :class="styles.slider"
        type="range"
        min="1"
        :max="latest"
        :value="seq"
        aria-label="Position in the shard: drag to jump to any entry"
        data-testid="chain-slider"
        @change="state.goTo(Number(($event.target as HTMLInputElement).value))"
      />
    </div>
    <p :class="styles.note" data-testid="chain-position">Shard {{ shardId }}: entry {{ seq }}{{ latest ? ` of ${latest}` : '' }}. Arrow keys step along the chain. Listed, not individually proven.</p>

    <AvalonWarningBanner v-if="phase === 'failed'" tone="danger" title="Could not show this entry" :message="error" />
    <p v-else-if="phase === 'loading' && !window.current" :class="styles.note">Loading the entry.</p>

    <div v-if="window.current" :class="styles.row">
      <div :class="styles.neighbour" data-testid="chain-before">
        <button v-if="window.prev" type="button" :class="styles.side" data-testid="chain-prev" @click="state.goTo(window.prev.seq)">
          <span :class="styles.caption">← Previous entry</span>
          <span :class="styles.seq">seq {{ window.prev.seq }}</span>
          <strong>{{ window.prev.kind }}</strong>
          <span :class="styles.meaning">{{ describeKind(window.prev.kind) }}</span>
          <span :class="styles.mono" :title="window.prev.entry_hash">{{ shortHash(window.prev.entry_hash) }}</span>
        </button>
        <div v-else :class="[styles.side, styles.empty]" data-testid="chain-prev-none">Start of the chain</div>
        <span :class="styles.link" :data-state="before" data-testid="chain-link-before">
          <AvalonStatusBadge :label="linkLabel(before)" :tone="before === 'linked' ? 'success' : before === 'broken' ? 'danger' : 'neutral'" />
        </span>
      </div>

      <article :class="styles.current" aria-label="Current entry" data-testid="chain-current">
        <header :class="styles.head">
          <span :class="styles.caption">Selected entry</span>
          <span :class="styles.seq">seq {{ window.current.seq }}</span>
          <strong>{{ window.current.kind }}</strong>
        </header>
        <p :class="styles.meaning" data-testid="chain-meaning">{{ describeKind(window.current.kind) }}</p>
        <div :class="styles.body">
          <dl :class="styles.fields">
            <dt>Subject</dt>
            <dd>{{ window.current.subject }}</dd>
            <dt>Issuer</dt>
            <dd>{{ window.current.issuer }}</dd>
            <dt>Time</dt>
            <dd :title="window.current.event_timestamp">{{ formatTime(window.current.event_timestamp) }}</dd>
            <dt>Entry hash</dt>
            <dd :class="styles.mono">{{ window.current.entry_hash }}</dd>
            <dt>Previous hash</dt>
            <dd :class="styles.mono">{{ window.current.prev_hash }}</dd>
          </dl>
          <pre :class="styles.payload" data-testid="chain-payload">{{ payloadText(window.current) }}</pre>
        </div>
        <AvalonButton label="Show in list" variant="secondary" @click="emit('show-in-list', { shardId, seq: window.current.seq })" />
      </article>

      <div :class="styles.neighbour" data-testid="chain-after">
        <button v-if="window.next" type="button" :class="styles.side" data-testid="chain-next" @click="state.goTo(window.next.seq)">
          <span :class="styles.caption">Next entry →</span>
          <span :class="styles.seq">seq {{ window.next.seq }}</span>
          <strong>{{ window.next.kind }}</strong>
          <span :class="styles.meaning">{{ describeKind(window.next.kind) }}</span>
          <span :class="styles.mono" :title="window.next.entry_hash">{{ shortHash(window.next.entry_hash) }}</span>
        </button>
        <div v-else :class="[styles.side, styles.empty]" data-testid="chain-next-none">End of the chain</div>
        <span :class="styles.link" :data-state="after" data-testid="chain-link-after">
          <AvalonStatusBadge :label="linkLabel(after)" :tone="after === 'linked' ? 'success' : after === 'broken' ? 'danger' : 'neutral'" />
        </span>
      </div>
    </div>
  </section>
</template>
