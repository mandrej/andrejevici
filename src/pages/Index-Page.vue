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

  <div v-if="isEmpty(emailWithCount)" class="row justify-center">
    <div class="text-body1 text-center q-mt-md col-xs-12 col-sm-8">
      There are no photos posted yet...<br />
      To add some you need to sign-in with your Google account. Only registered family users can
      add, delete or edit photos.
    </div>
  </div>
  <div v-else class="text-h4 text-center">
    <router-link
      v-for="(count, value) in emailWithCount"
      :key="value"
      :title="`${nickInsteadEmail(value as string)}: ${count}`"
      :to="{ path: '/list', query: { nick: nickInsteadEmail(value as string) } }"
      class="q-px-sm link"
      >{{ nickInsteadEmail(value as string) }}</router-link
    >
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { version, isEmpty, nickInsteadEmail } from '../helpers'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import HistoryButton from '../components/History-Button.vue'

const app = useAppStore()
const meta = useValuesStore()

const emailWithCount = computed(() => meta.emailWithCount)
const sinceYear = computed(() => meta.yearValues[(meta.yearValues.length - 1) as number])
const { bucket, find } = storeToRefs(app)

onMounted(async () => {
  // in App
  // await meta.fieldCount('year')
  // await meta.fieldCount('email')
  await meta.fieldCount('tags')
  await meta.fieldCount('model')
  await meta.fieldCount('lens')
})
</script>
