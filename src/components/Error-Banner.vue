<template>
  <q-banner
    v-if="clause"
    class="fixed-center text-center bg-warning q-pa-md"
    style="z-index: 100"
    rounded
  >
    <q-icon name="error_outline" size="4em" />
    <div class="text-h6"><slot name="title"></slot></div>
    <div><slot name="detail"></slot></div>
  </q-banner>
</template>

<script setup lang="ts">
defineProps({
  clause: Boolean,
})
</script>
