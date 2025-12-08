<template>
  <q-btn
    flat
    round
    size="2em"
    icon="history"
    @click="previousCollection"
    class="fixed-center z-max history-button"
  />
  <div class="text-body2">{{ version }}</div>
  <div class="text-h4 text-weight-thin">
    {{ $route.meta.title }}
  </div>
  <div v-if="bucket.count > 0" class="text-body2">
    {{ bucket.count }} photos since {{ sinceYear }} and counting
  </div>

  <div v-if="isEmpty(nickWithCount)" class="text-center text-body2">
    There are no photos posted yet...<br />
    To add some you need to sign-in with your Google account. Only registered users can add, delete
    or edit photos.
  </div>
  <div v-else class="q-pa-lg text-h4 text-center">
    <router-link
      v-for="(count, value) in nickWithCount"
      :key="value"
      :title="`${value}: ${count}`"
      :to="{ path: '/list', query: { nick: value } }"
      class="q-px-sm link"
      >{{ value }}</router-link
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { version, isEmpty } from 'src/helpers'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import { useRouter } from 'vue-router'

const app = useAppStore()
const meta = useValuesStore()
const router = useRouter()
const { find } = storeToRefs(app)

const nickWithCount = computed(() => meta.nickWithCount)
const sinceYear = computed(() => meta.yearValues[meta.yearValues.length - 1])
const { bucket } = storeToRefs(app)

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
