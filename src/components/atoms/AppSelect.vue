<template>
  <!-- Single-value Headless UI Listbox — replaces q-select (simple mode) -->
  <Listbox :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <div class="relative">
      <ListboxLabel v-if="label" class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {{ label }}
      </ListboxLabel>
      <ListboxButton
        :class="[
          'relative w-full cursor-pointer text-left focus:outline-none transition-colors',
          flat
            ? 'py-0 pr-6 text-lg font-semibold text-gray-900 dark:text-white bg-transparent'
            : 'rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-sm shadow-sm focus:ring-2 focus:ring-primary'
        ]"
      >
        <span class="block truncate">{{ displayValue }}</span>
        <span :class="['pointer-events-none absolute inset-y-0 right-0 flex items-center', flat ? '' : 'pr-2']">
          <AppIcon name="unfold_more" class="w-5 h-5 text-gray-400" />
        </span>
      </ListboxButton>

      <Transition
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions
          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-1 shadow-xl focus:outline-none"
        >
          <ListboxOption
            v-for="(option, index) in options"
            :key="String(optionValue(option)) + '-' + index"
            :value="optionValue(option)"
            v-slot="{ active, selected }"
          >
            <li
              :class="[
                'relative cursor-pointer select-none py-2 pl-10 pr-4 text-sm',
                active ? 'bg-primary/10 text-primary' : 'text-gray-900 dark:text-gray-100',
              ]"
            >
              <span :class="['block truncate', selected ? 'font-semibold' : 'font-normal']">
                {{ optionLabel(option) }}
              </span>
              <span v-if="selected" class="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                <AppIcon name="check" class="w-4 h-4" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </Transition>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue'
import AppIcon from './AppIcon.vue'

type ModelValue = string | number | boolean | object | null | undefined

interface SelectOption {
  label?: string
  value?: ModelValue
}

const props = defineProps<{
  modelValue?: ModelValue
  options: (string | number | SelectOption)[]
  label?: string
  emitValue?: boolean
  mapOptions?: boolean
  flat?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', v: ModelValue): void
}>()

const optionValue = (opt: string | number | SelectOption) =>
  typeof opt === 'object' && opt !== null && 'value' in opt ? opt.value : opt

const optionLabel = (opt: string | number | SelectOption) => {
  if (typeof opt === 'object' && opt !== null) {
    return opt.label ?? (typeof opt.value === 'string' || typeof opt.value === 'number' ? String(opt.value) : '—')
  }
  return String(opt)
}
const displayValue = computed(() => {
  const found = props.options.find((o) => optionValue(o) === props.modelValue)
  if (found) return optionLabel(found)
  return typeof props.modelValue === 'string' || typeof props.modelValue === 'number'
    ? String(props.modelValue)
    : '—'
})
</script>
