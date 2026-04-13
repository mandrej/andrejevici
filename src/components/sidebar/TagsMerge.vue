<template>
  <AutoComplete
    :label="label"
    v-model="tagsToApply"
    :options="tagsValues"
    canadd
    multiple
    :hint="hint"
    @new-value="
      (value: string, done: (value: string) => void) => meta.addNewValue(value, 'tags', done)
    "
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useValuesStore } from '../../stores/values'
import AutoComplete from '../AutoComplete.vue'

defineProps({
  label: {
    type: String,
    required: false,
    default: '',
  },
  hint: {
    type: String,
    required: false,
    default: '',
  },
})

const meta = useValuesStore()
const { tagsValues, tagsToApply } = storeToRefs(meta)
</script>
