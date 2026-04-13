<template>
  <q-select
    :model-value="modelValue"
    use-input
    hide-selected
    fill-input
    input-debounce="0"
    :label="label"
    :options="filteredOptions"
    @filter="filterFn"
    @input-value="updateValue"
    @update:model-value="updateValue"
    @clear="updateValue('')"
    :dense="$q.screen.xs"
    clearable
    class="full-width"
  >
    <template v-slot:prepend>
      <q-icon :name="icon" />
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue: string
  label?: string | undefined
  options?: string[] | undefined
  icon?: string | undefined
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Search',
  options: () => [],
  icon: 'sym_r_search',
})

const emit = defineEmits(['update:modelValue'])

const filteredOptions = ref<string[]>([])

const filterFn = (val: string, update: (callback: () => void) => void) => {
  if (val === '') {
    update(() => {
      filteredOptions.value = props.options
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredOptions.value = props.options.filter((v) => v.toLowerCase().indexOf(needle) > -1)
  })
}

const updateValue = (val: string | null) => {
  emit('update:modelValue', val || '')
}
</script>
