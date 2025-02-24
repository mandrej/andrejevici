<template>
  <form class="q-pa-md q-gutter-md" autocomplete="off">
    <q-input
      label="by title"
      v-model="tmp.text"
      :disable="busy"
      dark
      clearable
      :rules="[(val) => val === '' || val.length > 2 || 'Provide at least 3 characters']"
      @clear="submit"
      @keydown.enter.prevent="submit"
      :dense="$q.screen.xs"
    >
      <template #append>
        <q-icon v-if="tmp.text" name="search" class="cursor-pointer" @click="submit" />
      </template>
    </q-input>
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
import type { FindType } from '../helpers/models'
import type { LocationQueryRaw } from 'vue-router'

const app = useAppStore()
const meta = useValuesStore()
const route = useRoute()
const router = useRouter()
const { busy, find } = storeToRefs(app)
const { tagsValues, yearValues, modelValues, lensValues, nickValues } = storeToRefs(meta)
const tmp = ref({ ...(find.value as FindType) })

/**
 * Fixes and sanitizes the given query object by removing null or empty string values,
 * converting specific keys to appropriate types, and ensuring the 'tags' key is an array.
 *
 * @param {FindType} query - The query object to be sanitized.
 * @returns {FindType} - The sanitized query object.
 */
const fixQuery = (query: FindType): FindType => {
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
  return sanitizedQuery
}

watch(
  route,
  (to) => {
    tmp.value = find.value = fixQuery(to.query)
    app.fetchRecords(true)
  },
  { deep: true, immediate: true },
)

const submit = () => {
  tmp.value = find.value = fixQuery(tmp.value)
  router.push({
    path: '/list',
    query: tmp.value as LocationQueryRaw,
    hash: route.hash,
  })
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
