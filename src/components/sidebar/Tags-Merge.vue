<template>
  <Auto-Complete
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
import { useValuesStore } from 'src/stores/values'
import AutoComplete from 'src/components/Auto-Complete.vue'

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
