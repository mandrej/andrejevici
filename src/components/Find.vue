<template>
  <form class="q-pa-md q-gutter-md" autocomplete="off">
    <q-input
      label="by title"
      v-model="tmp.text"
      :disable="busy"
      dark
      clearable
      @blur="submit"
      :dense="$q.screen.xs"
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
import type { Find } from './models'

const app = useAppStore()
const meta = useValuesStore()
const route = useRoute()
const router = useRouter()
const { busy, find } = storeToRefs(app)
const { tagsValues, yearValues, modelValues, lensValues, nickValues } = storeToRefs(meta)
const tmp = ref({ ...(find.value as Find) })

/**
 * Dispatches a query to fetch records and updates the route based on the query parameters.
 *
 * @param {Find} query - The query object containing search parameters.
 * @param {string} [invoked=''] - Optional parameter to specify the invoked action.
 * @returns {Promise<void>} - A promise that resolves when the records are fetched and the route is updated.
 *
 * The function performs the following steps:
 * 1. Sanitizes the query object by removing null or empty values and converting specific keys.
 *    - Converts 'year', 'month', and 'day' values to numbers.
 *    - Converts 'tags' value to an array if it is a string.
 * 2. Updates the `tmp` and `find` values with the sanitized query.
 * 3. Fetches records with the new filter and resets the state.
 * 4. Updates the route based on the sanitized query:
 *    - If the sanitized query has keys, navigates to the '/list' path with the query parameters.
 *    - Otherwise, navigates to the root path '/'.
 */
const queryDispatch = async (query: Find, invoked = '') => {
  const sanitizedQuery = Object.fromEntries(
    Object.entries(query)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, value]) => value !== null && value !== '')
      .map(([key, value]) => {
        if (['year', 'month', 'day'].includes(key)) {
          return [key, +value]
        } else if (key === 'tags' && typeof value === 'string') {
          return [key, [value]]
        }
        return [key, value]
      }),
  )
  tmp.value = find.value = sanitizedQuery
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
