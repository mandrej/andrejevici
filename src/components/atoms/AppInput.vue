<template>
  <div class="flex flex-col gap-1 w-full">
    <label v-if="label" class="text-xs font-medium text-gray-500 ml-1">
      {{ label }}
    </label>
    <div class="relative group">
      <input
        :type="type"
        v-model="model"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
        :class="error ? 'border-red-500 focus:ring-red-500' : ''"
      />
      <button
        v-if="clearable && model"
        @click="clear"
        class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
      >
        <span class="material-symbols-rounded text-sm">close</span>
      </button>
    </div>
    <span v-if="errorMessage" class="text-[10px] text-red-500 ml-1">{{ errorMessage }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  model: string | number
  label?: string
  placeholder?: string
  type?: string
  disabled?: boolean
  clearable?: boolean
  rules?: Array<(v: any) => boolean | string>
}>()

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.model,
  set: (val) => emit('update:modelValue', val)
})

const errorMessage = computed(() => {
  if (!props.rules) return ''
  for (const rule of props.rules) {
    const res = rule(model.value)
    if (typeof res === 'string') return res
  }
  return ''
})

const clear = () => {
  emit('update:modelValue', '')
}
</script>
