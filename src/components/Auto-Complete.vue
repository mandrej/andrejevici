<template>
  <q-select
    :label="label"
    v-model="model"
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
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  model: {
    type: [String, Number, Array],
    required: false,
    default: '',
  },
  options: { type: Array, required: true },
  // tagging
  multiple: { type: Boolean, default: false },
  canadd: { type: Boolean, default: false },
  // label and value
  autocomplete: {
    type: String, // 'label'
    default: '',
  },
  label: { type: String, required: true },
})

const model = ref(props.model)
const options = ref(props.options)
const field = ref(props.autocomplete) // label
const debounce = 300

const filter = (val, update) => {
  if (val === '') {
    update(() => {
      options.value = props.options
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    if (field.value) {
      options.value = props.options.filter((v) => v[field.value].toLowerCase().indexOf(needle) > -1)
    } else {
      options.value = props.options.filter((v) => v.toLowerCase().indexOf(needle) > -1)
    }
  })
}
</script>
