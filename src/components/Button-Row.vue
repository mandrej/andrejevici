<template>
  <div v-if="wrap && $q.screen.xs" class="row items-center q-my-md">
    <div class="col-12 col q-mr-none">
      <slot></slot>
    </div>
    <div class="column col-12 items-end q-mt-sm">
      <slot name="button"></slot>
    </div>
  </div>

  <div v-else class="row items-center q-my-md">
    <div class="col q-mr-sm">
      <slot></slot>
    </div>
    <div class="col-auto items-end">
      <slot name="button"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  wrap: Boolean,
})
</script>
