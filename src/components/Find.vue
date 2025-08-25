<template>
  <q-form autocorrect="off" autocapitalize="off" autocomplete="off" spellcheck="false">
    <q-input
      label="by part of title"
      v-model="tmp.text"
      :disable="busy"
      dark
      dense
      clearable
      hint="type at least 3 characters"
      @clear="submit"
      @keydown.enter.prevent="submit"
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
      dark
      dense
      multiple
      hide-bottom-space
      @update:model-value="
        (newValue: string[]) => {
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
      dark
      dense
      hide-bottom-space
      @update:model-value="submit"
    />
    <div class="row">
      <Auto-Complete
        label="by month"
        v-model="tmp.month"
        :options="optionsMonth"
        :disable="busy"
        autocomplete="label"
        dark
        dense
        hide-bottom-space
        class="col"
        @update:model-value="submit"
      />
      <Auto-Complete
        label="by day"
        v-model="tmp.day"
        :options="optionsDay"
        :disable="busy"
        autocomplete="label"
        dark
        dense
        hide-bottom-space
        class="col"
        @update:model-value="submit"
      />
    </div>
    <Auto-Complete
      label="by model"
      v-model="tmp.model"
      :options="modelValues"
      :disable="busy"
      dark
      dense
      hide-bottom-space
      @update:model-value="submit"
    />
    <Auto-Complete
      label="by lens"
      v-model="tmp.lens"
      :options="lensValues"
      :disable="busy"
      dark
      dense
      hide-bottom-space
      @update:model-value="submit"
    />
    <Auto-Complete
      label="by author"
      v-model="tmp.nick"
      :options="activeNicks"
      :disable="busy"
      dark
      dense
      hide-bottom-space
      @update:model-value="submit"
    />

    <Auto-Complete
      v-if="editMode && user && user.isAdmin"
      label="Tags to merge with existing"
      v-model="tagsToApply"
      :options="tagsValues"
      dark
      dense
      canadd
      multiple
      hide-bottom-space
      @new-value="addNewTag"
    />
  </q-form>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useValuesStore } from '../stores/values'
import AutoComplete from './Auto-Complete.vue'
import { CONFIG, months } from '../helpers'
import type { FindType } from '../helpers/models'
import type { LocationQueryRaw } from 'vue-router'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const route = useRoute()
const router = useRouter()
const activeNicks = computed(() => {
  if (!meta.emailWithCount) return []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return Object.entries(meta.emailWithCount).map(([email, count]) => {
    return CONFIG.familyMap.get(email)
  })
})
const { busy, find, editMode } = storeToRefs(app)
const { user } = storeToRefs(auth)
const { tagsValues, yearValues, modelValues, lensValues, tagsToApply } = storeToRefs(meta)
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
  { immediate: true },
)

const submit = () => {
  tmp.value = find.value = fixQuery(tmp.value)
  router.push({
    path: '/list',
    query: tmp.value as LocationQueryRaw,
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

const addNewTag = (inputValue: string, done: (result: string) => void): void => {
  meta.addNewField(inputValue, 'tags')
  done(inputValue)
}
</script>
