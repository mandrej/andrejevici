<template>
  <label class="inline-flex items-center gap-2 cursor-pointer select-none">
    <div class="relative">
      <input
        type="checkbox"
        class="sr-only peer"
        :checked="isChecked"
        :disabled="disabled"
        @change="toggle"
      />
      <div
        :class="[
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150',
          isChecked
            ? 'bg-primary border-primary'
            : 'bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-500',
          disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary',
        ]"
      >
        <span v-if="isChecked" class="material-symbols-rounded text-white text-sm leading-none" style="font-size: 14px;">check</span>
      </div>
    </div>
    <span v-if="label" class="text-sm text-gray-700 dark:text-gray-300">{{ label }}</span>
    <slot />
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: boolean | unknown[]
  val?: unknown
  label?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean | unknown[]): void
}>()

const isChecked = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.includes(props.val)
  }
  return !!props.modelValue
})

const toggle = () => {
  if (Array.isArray(props.modelValue)) {
    const arr = [...props.modelValue]
    const idx = arr.indexOf(props.val)
    if (idx === -1) arr.push(props.val)
    else arr.splice(idx, 1)
    emit('update:modelValue', arr)
  } else {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>
