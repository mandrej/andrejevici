<template>
  <q-btn flat round :size="size" icon="history" @click="previousCollection" />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'

const app = useAppStore()
const router = useRouter()

defineProps({
  size: {
    type: String,
    required: false,
  },
})

const { find } = storeToRefs(app)

const previousCollection = () => {
  app.fetchRecords(true, 'refresh')
  router.push({
    path: '/list',
    query: find.value as Record<string, string | number | string[]>,
  })
}
</script>
