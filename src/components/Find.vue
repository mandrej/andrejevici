<template>
  <form class="q-pa-md q-gutter-md" autocomplete="off">
    <q-input
      label="by title"
      v-model="tmp.text"
      :disable="busy"
      clearable
      @blur="submit"
      :dense="$q.screen.xs"
      dark
    />
    <Auto-Complete
      label="by tags"
      v-model="tmp.tags"
      :options="tagsValues"
      :disable="busy"
      :dense="$q.screen.xs"
      dark
      multiple
      @update:model-value="
        (newValue) => {
          tmp.tags = newValue
          submit()
        }
      "
    />
    <Auto-Complete
      label="by year"
      v-model="tmp.year"
      :options="yearValues"
      :disable="busy"
      :dense="$q.screen.xs"
      dark
      class="col"
      @update:model-value="submit"
    />
    <div class="row">
      <Auto-Complete
        label="by month"
        v-model="tmp.month"
        :options="optionsMonth"
        :disable="busy"
        autocomplete="label"
        :dense="$q.screen.xs"
        dark
        class="col"
        @update:model-value="submit"
      />
      <div class="col-1" />
      <Auto-Complete
        label="by day"
        v-model="tmp.day"
        :options="optionsDay"
        :disable="busy"
        autocomplete="label"
        :dense="$q.screen.xs"
        dark
        class="col"
        @update:model-value="submit"
      />
    </div>
    <Auto-Complete
      label="by model"
      v-model="tmp.model"
      :options="modelValues"
      :disable="busy"
      :dense="$q.screen.xs"
      dark
      @update:model-value="submit"
    />
    <Auto-Complete
      label="by lens"
      v-model="tmp.lens"
      :options="lensValues"
      :disable="busy"
      :dense="$q.screen.xs"
      dark
      @update:model-value="submit"
    />
    <Auto-Complete
      label="by author"
      v-model="tmp.nick"
      :options="nickValues"
      :disable="busy"
      :dense="$q.screen.xs"
      dark
      @update:model-value="submit"
    />
  </form>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import AutoComplete from './Auto-Complete.vue'
import { months } from '../helpers'

const app = useAppStore()
const meta = useValuesStore()
const route = useRoute()
const router = useRouter()
const { busy, find } = storeToRefs(app)
const { tagsValues, yearValues, modelValues, lensValues, nickValues } = storeToRefs(meta)
const tmp = ref({ ...find.value })

const queryDispatch = (query, invoked = '') => {
  tmp.value = { ...query }
  // delete keys without values
  Object.keys(query).forEach((key) => {
    if (tmp.value[key] == null) {
      delete tmp.value[key]
    }
  })
  // adopt to match types
  Object.keys(tmp.value).forEach((key) => {
    if (['year', 'month', 'day'].includes(key)) {
      tmp.value[key] = +query[key]
    } else if (key === 'tags') {
      if (typeof tmp.value[key] === 'string') {
        tmp.value[key] = [query[key]]
      }
    }
  })

  find.value = tmp.value
  app.fetchRecords(true, invoked) // new filter with reset
  // this dispatch route change
  if (Object.keys(tmp.value).length) {
    router.push({ path: '/list', query: tmp.value, hash: route.hash })
  } else {
    router.push({ path: '/' })
  }
}

watch(
  route,
  (to) => {
    queryDispatch(to.query, 'route')
  },
  { deep: true, immediate: true },
)

const submit = () => {
  queryDispatch(tmp.value, 'submit')
}

const optionsMonth = computed(() => {
  return months.map((month, i) => ({ label: month, value: i + 1 }))
})
const optionsDay = computed(() => {
  const N = 31,
    from = 1,
    step = 1
  return [...Array(N)]
    .map((_, i) => from + i * step)
    .map((day) => {
      return { label: '' + day, value: day }
    })
})
</script>
