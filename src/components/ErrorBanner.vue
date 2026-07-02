<template>
  <AppBanner
    v-if="inquiry"
    color="warning"
    class="fixed inset-0 m-auto w-max max-w-md text-center z-[100] rounded-xl shadow-lg"
  >
    <div class="flex flex-col items-center gap-2">
      <AppIcon name="sym_r_error_outline" class="w-16 h-16" />
      <div class="text-xl font-bold"><slot name="title"></slot></div>
      <div><slot name="detail"></slot></div>
    </div>
  </AppBanner>
</template>

<script setup lang="ts">
import AppBanner from './atoms/AppBanner.vue'
import AppIcon from './atoms/AppIcon.vue'
defineProps<{
  inquiry: boolean
}>()
</script>
