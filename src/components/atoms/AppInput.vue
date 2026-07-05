<template>
  <!-- Wrapper label so the entire component is clickable -->
  <label
    class="relative flex flex-col gap-1 w-full"
    :class="{ 'opacity-50 pointer-events-none': disabled }"
  >
    <span v-if="label" class="text-xs font-medium text-gray-500 dark:text-gray-400">{{
      label
    }}</span>

    <div
      class="relative flex items-center w-full rounded-lg border transition-colors"
      :class="[
        readonly
          ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent',
        error
          ? 'border-negative focus-within:ring-negative'
          : ''
      ]"
    >
      <input
        v-bind="$attrs"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :readonly="readonly"
        :disabled="disabled"
        :required="required"
        :autofocus="autofocus"
        :step="step"
        class="flex-1 min-w-0 px-3 py-2 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none rounded-lg"
        :class="readonly ? 'cursor-default text-gray-500 dark:text-gray-400' : ''"
        @input="onInput"
        @change="onChange"
      />

      <!-- Clear button -->
      <button
        v-if="clearable && modelValue && !readonly"
        type="button"
        tabindex="-1"
        class="px-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        @click="$emit('update:modelValue', '')"
      >
        <AppIcon name="close" class="w-5 h-5" />
      </button>
    </div>

    <span v-if="hint && !error" class="text-[10px] text-gray-400 dark:text-gray-500">{{
      hint
    }}</span>
    <span v-if="error" class="text-[10px] text-negative">{{ error }}</span>
  </label>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    modelValue?: string | number | null
    label?: string
    hint?: string
    placeholder?: string
    type?: string
    readonly?: boolean
    disabled?: boolean
    clearable?: boolean
    required?: boolean
    autofocus?: boolean
    error?: string
    step?: string | number
  }>(),
  {
    type: 'text',
    clearable: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const onInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

const onChange = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>
