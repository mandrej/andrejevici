<template>
  <!-- Headless UI Combobox — replaces q-select with use-input / AutoComplete -->
  <div class="flex flex-col gap-1 w-full">
    <label v-if="label" class="text-xs font-medium text-gray-500 dark:text-gray-400">{{
      label
    }}</label>

    <Combobox
      :model-value="modelValue"
      @update:model-value="onUpdate"
      :multiple="multiple"
      :nullable="!multiple"
    >
      <div class="relative">
        <!-- Multi-value chips + input row -->
        <div
          class="flex flex-wrap gap-1 min-h-[38px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-colors"
        >
          <!-- Selected chips (multiple mode) -->
          <template v-if="multiple && Array.isArray(modelValue)">
            <span
              v-for="item in modelValue"
              :key="String(item)"
              class="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
            >
              {{ item }}
              <button
                type="button"
                @click.stop="removeItem(item)"
                class="hover:text-red-500 transition-colors"
              >
                <AppIcon name="close" class="w-3.5 h-3.5" />
              </button>
            </span>
          </template>

          <ComboboxInput
            class="flex-1 min-w-[80px] bg-transparent text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            :placeholder="placeholder"
            :display-value="() => (multiple ? query : String(modelValue ?? ''))"
            @change="query = $event.target.value"
            @keydown.enter.prevent="onEnter"
          />

          <!-- Clear button -->
          <ComboboxButton v-if="!multiple" class="absolute right-2 top-1/2 -translate-y-1/2">
            <AppIcon name="unfold_more" class="w-5 h-5 text-gray-400" />
          </ComboboxButton>
          <button
            v-if="clearable && (multiple ? (modelValue as unknown[]).length > 0 : modelValue)"
            type="button"
            @click.stop="onClear"
            class="absolute right-7 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <AppIcon name="close" class="w-5 h-5" />
          </button>
        </div>

        <!-- Dropdown -->
        <TransitionRoot
          leave="transition ease-in duration-100"
          leave-from="opacity-100"
          leave-to="opacity-0"
          @after-leave="query = ''"
        >
          <ComboboxOptions
            v-if="filteredOptions.length > 0 || (canadd && query.length > 0)"
            class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl py-1 focus:outline-none"
          >
            <!-- Add new option -->
            <ComboboxOption
              v-if="canadd && query.length > 1 && !filteredOptions.includes(query)"
              :value="query"
              v-slot="{ active }"
            >
              <li
                :class="[
                  'px-4 py-2 text-sm cursor-pointer flex items-center gap-2',
                  active ? 'bg-primary/10 text-primary' : 'text-gray-700 dark:text-gray-200',
                ]"
              >
                <AppIcon name="add" class="w-4 h-4" />
                Add "{{ query }}"
              </li>
            </ComboboxOption>

            <ComboboxOption
              v-for="option in filteredOptions"
              :key="String(option)"
              :value="option"
              v-slot="{ active, selected }"
            >
              <li
                :class="[
                  'relative cursor-pointer select-none py-2 pl-10 pr-4 text-sm',
                  active ? 'bg-primary/10 text-primary' : 'text-gray-900 dark:text-gray-100',
                ]"
              >
                <span :class="['block truncate', selected ? 'font-semibold' : 'font-normal']">{{
                  option
                }}</span>
                <span
                  v-if="selected"
                  class="absolute inset-y-0 left-0 flex items-center pl-3 text-primary"
                >
                  <AppIcon name="check" class="w-4 h-4" />
                </span>
              </li>
            </ComboboxOption>
          </ComboboxOptions>
        </TransitionRoot>
      </div>
    </Combobox>

    <span v-if="hint" class="text-[10px] text-gray-400 dark:text-gray-500">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  TransitionRoot,
} from '@headlessui/vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | string[] | null
    options: string[]
    label?: string
    hint?: string
    placeholder?: string
    multiple?: boolean
    clearable?: boolean
    canadd?: boolean
    rules?: Array<(v: unknown) => boolean | string>
  }>(),
  {
    modelValue: null,
    multiple: false,
    clearable: true,
    canadd: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | string[] | null): void
  (e: 'newValue', value: string, done: (value: string) => void): void
}>()

const query = ref('')

const filteredOptions = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return props.options
  return props.options.filter((o) => o.toLowerCase().includes(q))
})

const onUpdate = (val: string | string[] | null) => {
  if (props.multiple && Array.isArray(val)) {
    // dedupe
    const unique = [...new Set(val)]
    emit('update:modelValue', unique)
    query.value = ''
  } else {
    emit('update:modelValue', val)
    query.value = ''
  }
}

const onEnter = () => {
  if (props.canadd && query.value.length > 0) {
    const done = (value: string) => {
      if (props.multiple) {
        const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
        if (!arr.includes(value)) arr.push(value)
        emit('update:modelValue', arr)
      } else {
        emit('update:modelValue', value)
      }
    }
    emit('newValue', query.value, done)
    query.value = ''
  }
}

const removeItem = (item: string) => {
  if (Array.isArray(props.modelValue)) {
    emit(
      'update:modelValue',
      props.modelValue.filter((v) => v !== item),
    )
  }
}

const onClear = () => {
  emit('update:modelValue', props.multiple ? [] : null)
  query.value = ''
}
</script>
