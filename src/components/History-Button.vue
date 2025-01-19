<template>
  <q-btn flat round :size="size" icon="history" @click="previousCollection" />
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'

const app = useAppStore()
const router = useRouter()

defineProps({
  size: {
    type: String,
    required: false,
  },
})

const previousCollection = () => {
  app.fetchRecords(true, 'refresh')
  router.push({ path: '/list', query: app.find })
}
</script>
