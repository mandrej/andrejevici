<template>
  <span
    :class="[
      'inline-flex items-center rounded-full font-medium whitespace-nowrap',
      sizeClass,
      bgClass,
      textColorClass,
    ]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    color?: string
    textColor?: string
    size?: 'xs' | 'sm' | 'md'
  }>(),
  { color: 'primary', size: 'sm' },
)

const bgMap: Record<string, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  warning: 'bg-warning',
  negative: 'bg-negative',
  positive: 'bg-positive',
  accent: 'bg-accent',
  grey: 'bg-gray-500',
}

const textMap: Record<string, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  warning: 'text-gray-900',
  negative: 'text-white',
  positive: 'text-white',
  accent: 'text-white',
  grey: 'text-white',
  white: 'text-white',
  black: 'text-gray-900',
  dark: 'text-gray-900',
}

const sizeMap = { xs: 'text-xs px-1.5 py-0.5', sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' }

const bgClass = computed(() => bgMap[props.color] ?? 'bg-gray-100 dark:bg-gray-700')
const textColorClass = computed(() => (props.textColor ? (textMap[props.textColor] ?? `text-${props.textColor}`) : textMap[props.color] ?? 'text-gray-800 dark:text-gray-200'))
const sizeClass = computed(() => sizeMap[props.size])
</script>
