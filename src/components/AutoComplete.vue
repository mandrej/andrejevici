<template>
  <q-select
    :label="label"
    :hint="hint"
    v-model="val"
    :options="options"
    :hide-selected="multiple ? false : true"
    :multiple="multiple ? true : undefined"
    :fill-input="multiple ? false : true"
    :emit-value="autocomplete ? true : undefined"
    :map-options="autocomplete ? true : undefined"
    :hide-dropdown-icon="canadd ? true : undefined"
    :new-value-mode="canadd ? 'add-unique' : undefined"
    :input-debounce="debounce"
    use-input
    clearable
    @filter="filter"
    @new-value="(value, done) => emit('newValue', value, done)"
  />
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, computed } from 'vue'

interface Props {
  modelValue?: string | number | any[] | null | undefined
  options: any[]
  multiple?: boolean | undefined
  canadd?: boolean | undefined
  autocomplete?: string | undefined
  label: string
  hint?: string | undefined
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  multiple: false,
  canadd: false,
  autocomplete: '',
  hint: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'newValue', value: string, done: (value: string) => void): void
}>()

const val = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v === null ? (props.multiple ? [] : '') : v),
})

const options = ref(props.options)
const field = ref(props.autocomplete) // label
const debounce = 300

const filter = (val: string, update: (callback: () => void) => void) => {
  if (val === '') {
    update(() => {
      options.value = props.options
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    if (field.value) {
      options.value = props.options.filter(
        (v: any) => v[field.value].toLowerCase().indexOf(needle) > -1,
      )
    } else {
      options.value = props.options.filter((v: any) => v.toLowerCase().indexOf(needle) > -1)
    }
  })
}
</script>
