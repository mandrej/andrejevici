<template>
  <div class="row justify-center">
    <div class="text-h4 text-right text-weight-thin">
      <span class="q-ma-none text-body2 text-right">{{ version }}</span
      ><br />
      {{ $route.meta.title }}
      <p v-if="bucket.count > 0" class="q-ma-none text-body2">
        {{ bucket.count }} photos since {{ sinceYear }} and counting
      </p>
    </div>
    <HistoryButton v-if="find && Object.keys(find).length" size="2.3em" />
  </div>

  <div class="row justify-center">
    <div v-if="isEmpty(nickWithCount)" class="text-body2 text-center q-mt-md col-xs-12 col-sm-8">
      There are no photos posted yet...<br />
      To add some you need to sign-in with your Google account. Only registered family users can
      add, delete or edit photos.
    </div>
    <div v-else class="text-h4">
      <router-link
        v-for="(count, value) in nickWithCount"
        :key="value"
        :title="`${value}: ${count}`"
        :to="{ path: '/list', query: { nick: value } }"
        class="q-px-sm link"
        >{{ value }}</router-link
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { version, isEmpty } from 'src/helpers'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import HistoryButton from 'src/components/History-Button.vue'

const app = useAppStore()
const meta = useValuesStore()

const nickWithCount = computed(() => meta.nickWithCount)
const sinceYear = computed(() => meta.yearValues[meta.yearValues.length - 1])
const { bucket, find } = storeToRefs(app)

onMounted(async () => {
  // in App
  // await meta.fieldCount('year')
  // await meta.fieldCount('nick')
  await meta.fieldCount('tags')
  await meta.fieldCount('model')
  await meta.fieldCount('lens')
})
</script>
