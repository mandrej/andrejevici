<template>
  <q-btn flat round :size="size" icon="history" @click="previousCollection" />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { watch } from 'vue'
import type { FindType } from 'src/helpers/models'

const app = useAppStore()
const router = useRouter()

defineProps({
  size: {
    type: String,
    required: false,
  },
})

const { find, currentEdit } = storeToRefs(app)

watch(
  currentEdit,
  (newRec) => {
    find.value = { year: newRec.year, month: newRec.month, day: newRec.day } as FindType
  },
  { deep: true },
)

const previousCollection = () => {
  // app.fetchRecords(true, 'refresh')
  if (find.value) {
    void router.push({
      path: '/list',
      query: { ...find.value },
    })
  }
}
</script>
