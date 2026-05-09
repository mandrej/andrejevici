<template>
  <q-card flat bordered class="full-height column">
    <q-card-section class="col">
      <div class="row items-center no-wrap q-mb-sm">
        <q-icon :name="icon" :color="color" size="sm" class="q-mr-sm" />
        <div class="text-subtitle1 text-weight-bold">{{ title }}</div>
      </div>
      <div class="text-caption text-grey-7 q-mb-sm">
        {{ description }}
      </div>
      <slot name="details"></slot>
    </q-card-section>
    <q-separator />
    <q-card-actions align="right">
      <slot name="action"></slot>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
  color?: string
}>()
</script>
