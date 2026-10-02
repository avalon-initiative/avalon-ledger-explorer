<script setup lang="ts">
import styles from '../styles/WelcomePanel.module.scss'
</script>

<template>
  <section :class="styles.welcome" aria-label="Getting started" data-testid="welcome">
    <h2 :class="styles.title">Choose a network above to start</h2>
    <p :class="styles.lead">
      Avalon keeps a public, append-only ledger of things like identities, guilds and achievements. This page reads that ledger from a node and checks it itself, so you do not have to trust the node.
    </p>
    <div :class="styles.columns">
      <ol :class="styles.steps">
        <li><strong>Pick a network.</strong> The explorer finds a node for it and checks that the node’s latest ledger head is signed by the network and witnessed by others.</li>
        <li><strong>Browse the ledger.</strong> Step through entries one at a time, search for an identity by name, follow one identity’s history, or watch new entries arrive.</li>
        <li><strong>Check the links.</strong> Every entry carries the hash of the one before it, so a changed or missing entry shows up as a broken link.</li>
      </ol>
      <dl :class="styles.terms">
        <dt>Network</dt>
        <dd>A group of nodes that agree on one ledger, named by its network id.</dd>
        <dt>Node</dt>
        <dd>A server that holds a copy of the ledger and answers questions about it.</dd>
        <dt>Shard</dt>
        <dd>One independent ledger inside a network. Most networks only use <code>core</code>.</dd>
        <dt>Tree head</dt>
        <dd>A signed summary of the whole ledger at one moment. If an entry changes, the head no longer matches.</dd>
      </dl>
    </div>
  </section>
</template>
