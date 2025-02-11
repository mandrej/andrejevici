<template>
  <div class="text-h4 text-center">
    <router-link
      v-for="(count, value) in meta.nickWithCount"
      :key="value"
      :title="`${value}: ${count}`"
      :to="{ path: '/list', query: { nick: value } }"
      class="q-px-sm link"
      >{{ value }}</router-link
    >
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useValuesStore } from '../stores/values'

const meta = useValuesStore()

onMounted(() => {
  if (Object.keys(meta.values.email).length === 0) {
    meta.fieldCount('email')
    meta.fieldCount('year')
    meta.fieldCount('tags')
    meta.fieldCount('model')
    meta.fieldCount('lens')
  }
})
</script>
