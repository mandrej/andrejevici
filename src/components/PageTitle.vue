<template>
  <q-banner class="q-pa-md" inline-actions>
    <template v-slot:avatar>
      <q-icon :name="icon" />
    </template>
    <span class="text-h6">{{ title }}</span>
    <template v-slot:action>
      <slot name="action"></slot>
    </template>
  </q-banner>
</template>

<script setup lang="ts">
defineProps({
  title: String,
  icon: String,
})
</script>
