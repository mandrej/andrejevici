<template>
  <div class="relative w-full overflow-hidden" :style="{ height: `${height}px` }">
    <div
      v-if="indeterminate"
      :class="['absolute inset-y-0 rounded-full animate-progress-indeterminate', colorClass]"
      style="width: 30%"
    />
    <div
      v-else
      :class="['h-full rounded-full transition-all duration-300', colorClass]"
      :style="{ width: `${Math.min(Math.max(value * 100, 0), 100)}%` }"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value?: number
    indeterminate?: boolean
    color?: 'primary' | 'secondary' | 'warning' | 'negative' | 'positive' | string
    height?: number
  }>(),
  {
    value: 0,
    indeterminate: false,
    color: 'primary',
    height: 3,
  },
)

const colorMap: Record<string, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  warning: 'bg-warning',
  negative: 'bg-negative',
  positive: 'bg-positive',
  info: 'bg-info',
  accent: 'bg-accent',
}

const colorClass = colorMap[props.color] ?? 'bg-primary'
</script>

<style scoped>
@keyframes progress-indeterminate {
  0% { transform: translateX(-100%) scaleX(1); }
  50% { transform: translateX(100%) scaleX(1.5); }
  100% { transform: translateX(300%) scaleX(1); }
}
.animate-progress-indeterminate {
  animation: progress-indeterminate 1.5s linear infinite;
}
</style>
