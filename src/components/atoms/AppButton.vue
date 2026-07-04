<template>
  <!-- Polymorphic button: renders <router-link>, <a>, or <button> based on props -->
  <component
    :is="tag"
    v-bind="tagProps"
    :type="tag === 'button' ? type : undefined"
    :disabled="disabled || undefined"
    :class="classes"
    v-on="handlers"
  >
    <AppIcon v-if="icon && !label" :name="icon" class="w-5 h-5 leading-none" />
    <AppIcon v-if="icon && label" :name="icon" class="w-5 h-5 leading-none mr-1.5" />
    <span v-if="label">{{ label }}</span>
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    label?: string
    icon?: string
    color?: 'primary' | 'secondary' | 'warning' | 'negative' | 'positive' | 'accent' | (string & {})
    flat?: boolean
    round?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    to?: string | Record<string, unknown>
    href?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    color: 'default',
    flat: false,
    round: false,
    disabled: false,
    type: 'button',
    size: 'md',
  },
)

const emit = defineEmits<{
  (e: 'click', ev: MouseEvent): void
}>()

const tag = computed(() => {
  if (props.to) return RouterLink
  if (props.href) return 'a'
  return 'button'
})

const tagProps = computed(() => {
  if (props.to) return { to: props.to }
  if (props.href) return { href: props.href, target: '_blank', rel: 'noopener' }
  return {}
})

const handlers = computed(() => ({
  click: (ev: MouseEvent) => {
    if (!props.disabled) emit('click', ev)
  },
}))

const sizeMap = {
  sm: 'text-xs px-2.5 py-1',
  md: 'text-sm px-3.5 py-1.5',
  lg: 'text-base px-5 py-2.5',
}
const sizeCls = computed(() => sizeMap[props.size])

const colorMap: Record<string, { solid: string; flat: string }> = {
  primary: {
    solid: 'bg-primary text-white hover:bg-primary/90',
    flat: 'text-primary hover:bg-primary/10',
  },
  secondary: {
    solid: 'bg-secondary text-black hover:bg-secondary/90',
    flat: 'text-secondary hover:bg-secondary/10',
  },
  warning: {
    solid: 'bg-warning text-black hover:bg-warning/90',
    flat: 'text-warning hover:bg-warning/10',
  },
  negative: {
    solid: 'bg-negative text-white hover:bg-negative/90',
    flat: 'text-negative hover:bg-negative/10',
  },
  positive: {
    solid: 'bg-positive text-white hover:bg-positive/90',
    flat: 'text-positive hover:bg-positive/10',
  },
  accent: {
    solid: 'bg-accent text-white hover:bg-accent/90',
    flat: 'text-accent hover:bg-accent/10',
  },
  default: {
    solid:
      'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600',
    flat: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
  },
}

const classes = computed(() => {
  const c = colorMap[props.color] ?? colorMap.default
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95'
  const shape = props.round ? 'rounded-full' : 'rounded-lg'
  const variant = props.flat ? c.flat : c.solid
  const dis = props.disabled
    ? 'opacity-40 cursor-not-allowed pointer-events-none'
    : 'cursor-pointer'
  return [base, shape, sizeCls.value, variant, dis]
})
</script>
