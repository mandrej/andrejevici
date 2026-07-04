<template>
  <div
    class="flex flex-col h-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
  >
    <!-- Header -->
    <div
      class="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
    >
      <AppIcon :name="icon" class="w-5 h-5" :class="`text-${color}`" />
      <div>
        <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ title }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ description }}</div>
      </div>
    </div>

    <!-- Details slot -->
    <div class="flex-1 p-3">
      <slot name="details" />
    </div>

    <!-- Action slot -->
    <div class="flex justify-end p-3 border-t border-gray-200 dark:border-gray-700">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from './atoms/AppIcon.vue'
defineProps<{
  icon: string
  title: string
  description: string
  color?: string
}>()
</script>
