<template>
  <component
    :is="to ? 'router-link' : 'button'"
    :to="to"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center px-3 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
      colorClasses[color] || 'bg-gray-200 text-gray-800',
      flat ? 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800' : '',
      round ? 'rounded-full px-2' : '',
      dense ? 'px-2 py-1 text-xs' : '',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    ]"
  >
    <span v-if="icon" class="material-symbols-rounded text-xl" :class="round && !label ? 'text-2xl' : ''">
      {{ icon }}
    </span>
    <span v-if="label" :class="icon ? 'ml-2' : ''">{{ label }}</span>
    <slot />
  </component>
</template>

<script setup lang="ts">
interface Props {
  label?: string
  color?: 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'info' | 'warning' | 'grey' | string
  flat?: boolean
  round?: boolean
  dense?: boolean
  icon?: string
  disabled?: boolean
  to?: string | object
}

withDefaults(defineProps<Props>(), {
  color: 'primary',
  flat: false,
  round: false,
  dense: false,
  disabled: false,
})

const colorClasses = {
  primary: 'bg-primary text-white hover:bg-blue-700',
  secondary: 'bg-secondary text-black hover:bg-teal-400',
  accent: 'bg-accent text-white hover:bg-purple-700',
  positive: 'bg-positive text-black hover:bg-green-400',
  negative: 'bg-negative text-white hover:bg-red-700',
  info: 'bg-info text-white hover:bg-cyan-600',
  warning: 'bg-warning text-black hover:bg-yellow-500',
  grey: 'bg-gray-300 text-gray-800 hover:bg-gray-400',
}
</script>
