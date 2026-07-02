<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
      colorClasses[color] || 'bg-gray-200 text-gray-800',
      textColor === 'black' ? 'text-black' : 'text-white'
    ]"
  >
    <span v-if="icon" class="material-symbols-rounded text-sm mr-1">{{ icon }}</span>
    <slot />
  </span>
</template>

<script setup lang="ts">
interface Props {
  color?: 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'info' | 'warning' | 'grey' | string
  textColor?: 'black' | 'white' | string
  icon?: string
}

withDefaults(defineProps<Props>(), {
  color: 'primary',
  textColor: 'white',
})

const colorClasses = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  positive: 'bg-positive',
  negative: 'bg-negative',
  info: 'bg-info',
  warning: 'bg-warning',
  grey: 'bg-gray-300',
}
</script>
