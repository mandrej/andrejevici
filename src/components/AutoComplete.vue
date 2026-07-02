<template>
  <!-- Replaces q-select with use-input in AutoComplete — delegates to AppCombobox -->
  <AppCombobox
    :model-value="val"
    @update:model-value="(v) => emit('update:modelValue', v === null ? (multiple ? [] : '') : v)"
    :options="options"
    :label="label"
    :hint="hint"
    :multiple="multiple"
    :clearable="true"
    :canadd="canadd"
    @new-value="(value, done) => emit('newValue', value, done)"
  />
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed } from 'vue'
import AppCombobox from './atoms/AppCombobox.vue'

interface Props {
  modelValue?: string | string[] | null | undefined
  options: string[]
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

const val = computed(() => props.modelValue)
</script>
