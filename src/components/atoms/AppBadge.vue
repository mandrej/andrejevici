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
  primary: 'bg-primary/10 dark:bg-primary/20',
  secondary: 'bg-secondary/10 dark:bg-secondary/20',
  warning: 'bg-warning/20',
  negative: 'bg-negative/10',
  positive: 'bg-positive/10',
  accent: 'bg-accent/10',
}

const textMap: Record<string, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  warning: 'text-warning dark:text-yellow-400',
  negative: 'text-negative',
  positive: 'text-positive',
  accent: 'text-accent',
  white: 'text-white',
  black: 'text-gray-900',
  dark: 'text-gray-900',
}

const sizeMap = { xs: 'text-xs px-1.5 py-0.5', sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' }

const bgClass = computed(() => bgMap[props.color] ?? 'bg-gray-100 dark:bg-gray-700')
const textColorClass = computed(() => (props.textColor ? (textMap[props.textColor] ?? `text-${props.textColor}`) : textMap[props.color] ?? 'text-gray-800 dark:text-gray-200'))
const sizeClass = computed(() => sizeMap[props.size])
</script>
