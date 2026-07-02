<template>
  <div
    :class="[
      'flex items-center p-4 rounded-lg border-l-4 transition-colors',
      colorClasses[color] || 'bg-gray-100 border-gray-400 text-gray-800',
      'dark:bg-gray-800 dark:text-gray-200'
    ]"
  >
    <div v-if="icon" class="flex-shrink-0 mr-3">
      <AppIcon :name="icon" class="w-6 h-6" />
    </div>
    <div class="flex-grow">
      <slot />
    </div>
    <div v-if="$slots.default && $slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'
interface Props {
  color?: 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'info' | 'warning' | 'grey' | (string & {})
  icon?: string
}

withDefaults(defineProps<Props>(), {
  color: 'info',
})

const colorClasses: Record<string, string> = {
  primary: 'bg-blue-50 border-blue-500 text-blue-800',
  secondary: 'bg-teal-50 border-teal-500 text-teal-800',
  accent: 'bg-purple-50 border-purple-500 text-purple-800',
  positive: 'bg-green-50 border-green-500 text-green-800',
  negative: 'bg-red-50 border-red-500 text-red-800',
  info: 'bg-blue-100 border-blue-400 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  grey: 'bg-gray-100 border-gray-400 text-gray-700',
}
</script>
