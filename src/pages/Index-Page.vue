<template>
  <q-img src="apperture.svg" style="width: 25vw; height: 25vw" class="q-ma-md" />
  <div class="text-caption">Build {{ build }}</div>
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
  <div v-else class="text-center text-body2 q-mt-md q-gutter-sm">
    <q-btn
      v-for="[nick] in topNicks"
      :key="nick"
      :label="nick"
      rounded
      color="secondary"
      text-color="black"
      @click="searchByNick(nick)"
    />
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
    </q-btn-toggle>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { build, isEmpty } from 'src/helpers'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'

const app = useAppStore()
const meta = useValuesStore()
const router = useRouter()

const nickWithCount = computed(() => meta.nickWithCount)
const topNicks = computed(() => Object.entries(nickWithCount.value).slice(0, 2))
const sinceYear = computed(() => meta.yearValues[meta.yearValues.length - 1])
const { bucket, theme: appTheme } = storeToRefs(app)

const searchByNick = async (nick: string) => {
  app.find = { nick }
  await app.fetchRecords(true)
  router.push('/list')
}

const theme = computed({
  get: () => appTheme.value,
  set: (val: 'light' | 'dark' | 'auto') => {
    app.setTheme(val)
  },
})
</script>
