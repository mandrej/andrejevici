<template>
  <div class="text-h4 text-center">
    <router-link
      v-for="(count, value) in meta.emailWithCount"
      :key="value"
      :title="`${CONFIG.familyMap.get(value as string)}: ${count}`"
      :to="{ path: '/list', query: { nick: CONFIG.familyMap.get(value as string) } }"
      class="q-px-sm link"
      >{{ CONFIG.familyMap.get(value as string) }}</router-link
    >
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { CONFIG } from '../helpers'
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
