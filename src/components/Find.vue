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
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import AutoComplete from './Auto-Complete.vue'
import { months } from '../helpers'
import type { Find } from './models'

const app = useAppStore()
const meta = useValuesStore()
const route = useRoute()
const router = useRouter()
const { busy, find } = storeToRefs(app)
const { tagsValues, yearValues, modelValues, lensValues, nickValues } = storeToRefs(meta)
const tmp = { ...(find.value as Find) }

/**
 * Dispatches a query to find data.
 *
 * @param {Find} query - The query object containing search parameters.
 * @param {string} [invoked=''] - An optional string indicating the source of the invocation.
 * @returns {Promise<void>} - A promise that resolves when the query is dispatched.
 */
const queryDispatch = async (query: Find, invoked = '') => {
  const sanitizedQuery = { ...query }

  // delete keys without values
  Object.keys(sanitizedQuery).forEach((key) => {
    if (sanitizedQuery[key as keyof Find] == null) {
      delete sanitizedQuery[key as keyof Find]
    }
  })

  // adopt to match types
  Object.keys(sanitizedQuery).forEach((key) => {
    if (['year', 'month', 'day'].includes(key)) {
      sanitizedQuery[key as 'year' | 'month' | 'day'] = +(sanitizedQuery[
        key as keyof Find
      ] as number)
    } else if (key === 'tags' && typeof sanitizedQuery[key as keyof Find] === 'string') {
      sanitizedQuery[key as 'tags'] = [sanitizedQuery[key as keyof Find] as string]
    }
  })

  find.value = sanitizedQuery
  await app.fetchRecords(true, invoked) // new filter with reset

  // this dispatch route change
  if (Object.keys(sanitizedQuery).length) {
    router.push({
      path: '/list',
      query: sanitizedQuery as Record<string, string | number | string[]>,
      hash: route.hash,
    })
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
  queryDispatch(tmp, 'submit')
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
