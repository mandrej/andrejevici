<template>
  <!-- Simple search input with icon + clear — replaces q-select use-input mode -->
  <div class="relative flex items-center w-full">
    <span class="absolute left-3 text-gray-400 dark:text-gray-500 material-symbols-rounded text-xl pointer-events-none">
      search
    </span>
    <input
      type="text"
      :value="modelValue"
      :placeholder="label"
      class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 pl-9 pr-9 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors placeholder-gray-400"
      @input="onInput"
      @change="onChange"
      list="local-search-options"
    />
    <datalist id="local-search-options">
      <option v-for="opt in options" :key="opt" :value="opt" />
    </datalist>
    <!-- Clear button -->
    <button
      v-if="modelValue"
      type="button"
      class="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      @click="$emit('update:modelValue', '')"
    >
      <span class="material-symbols-rounded text-xl">close</span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  label?: string
  options?: string[]
}

withDefaults(defineProps<Props>(), {
  label: 'Search',
  options: () => [],
})

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
