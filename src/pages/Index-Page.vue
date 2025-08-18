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

onMounted(async () => {
  // in App
  // await meta.fieldCount('year')
  // await meta.fieldCount('email')
  await meta.fieldCount('tags')
  await meta.fieldCount('model')
  await meta.fieldCount('lens')
})
</script>
