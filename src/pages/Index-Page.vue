<template>
  <q-btn
    flat
    round
    size="2em"
    icon="history"
    @click="previousCollection"
    class="fixed-center history-button"
  />
  <q-img src="apperture.svg" style="width: 25vw; height: 25vw" class="q-ma-md" />
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

  <div class="fixed-bottom-right q-pa-md z-max">
    <q-btn-toggle
      v-model="theme"
      flat
      dense
      rounded
      toggle-color="primary"
      color="grey-7"
      size="sm"
      padding="4px"
      :options="[
        { icon: 'light_mode', value: 'light', slot: 'light' },
        { icon: 'dark_mode', value: 'dark', slot: 'dark' },
        { icon: 'brightness_6', value: 'auto', slot: 'auto' },
      ]"
    >
      <template v-slot:light>
        <q-tooltip>Light Mode</q-tooltip>
      </template>
      <template v-slot:dark>
        <q-tooltip>Dark Mode</q-tooltip>
      </template>
      <template v-slot:auto>
        <q-tooltip>System Mode</q-tooltip>
      </template>
    </q-btn-toggle>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { version, isEmpty } from 'src/helpers'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import { useRouter } from 'vue-router'

const $q = useQuasar()
const app = useAppStore()
const meta = useValuesStore()
const router = useRouter()
const { find } = storeToRefs(app)

const nickWithCount = computed(() => meta.nickWithCount)
const sinceYear = computed(() => meta.yearValues[meta.yearValues.length - 1])
const { bucket } = storeToRefs(app)

const theme = computed({
  get: () => ($q.dark.mode === 'auto' ? 'auto' : $q.dark.isActive ? 'dark' : 'light'),
  set: (val: 'light' | 'dark' | 'auto') => {
    $q.dark.set(val === 'auto' ? 'auto' : val === 'dark')
  },
})

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
