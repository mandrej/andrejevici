<template>
  <div class="global-search">
    <div class="search-wrapper">
      <q-select
        v-model="dummySelect"
        v-model:input-value="searchInput"
        use-input
        multiple
        hide-selected
        input-debounce="0"
        :options="filteredSuggestions"
        :placeholder="hasActiveFilters ? '' : 'Search by tag: beograd year: 2022 etc...'"
        borderless
        standout
        hide-dropdown-icon
        class="search-input"
        option-value="key"
        @filter="onFilter"
        @update:model-value="onSelect"
        @keydown.enter="handleKeyDownEnter"
      >
        <template #prepend>
          <!-- Active Filters as Chips Inside Input -->
          <div class="active-filters-row">
            <q-chip v-if="tmp.text" removable @remove="removeFilter('text')">
              {{ tmp.text }}
            </q-chip>

            <q-chip v-for="tag in tmp.tags" :key="tag" removable @remove="removeTag(tag)">
              {{ tag }}
            </q-chip>

            <q-chip v-if="tmp.year" removable @remove="removeFilter('year')">
              {{ tmp.year }}
            </q-chip>

            <q-chip v-if="tmp.month" removable @remove="removeFilter('month')">
              {{ getMonthName(tmp.month) }}
            </q-chip>

            <q-chip v-if="tmp.model" removable @remove="removeFilter('model')">
              {{ tmp.model }}
            </q-chip>

            <q-chip v-if="tmp.lens" removable @remove="removeFilter('lens')">
              {{ tmp.lens }}
            </q-chip>

            <q-chip v-if="tmp.nick" removable @remove="removeFilter('nick')">
              {{ tmp.nick }}
            </q-chip>
          </div>
        </template>

        <template #option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section>
              <q-item-label v-if="scope.opt.field === 'title'">
                <strong>title:</strong> {{ scope.opt.value }}
              </q-item-label>
              <q-item-label v-else>
                <strong>{{ scope.opt.field }}:</strong> {{ scope.opt.value }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>

        <template #no-option>
          <q-item v-if="searchInput.length >= 3">
            <q-item-section class="text-grey">
              Press Enter to search in headlines for "{{ searchInput }}"
            </q-item-section>
          </q-item>
        </template>
      </q-select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import { months } from 'src/helpers'
import type { FindType } from 'src/helpers/models'
import type { LocationQueryRaw } from 'vue-router'

interface Suggestion {
  key: string
  field: string
  value: string
  count?: number
}

const app = useAppStore()
const meta = useValuesStore()
const route = useRoute()
const router = useRouter()

const { find } = storeToRefs(app)
const { tagsValues, yearValues, modelValues, lensValues, nickValues } = storeToRefs(meta)
const tmp = ref({ ...(find.value as FindType) })
const searchInput = ref('')
const dummySelect = ref<Suggestion[]>([])
const filteredSuggestions = ref<Suggestion[]>([])

// Build all available suggestions from valuesStore
const allSuggestions = computed(() => {
  const suggestions: Suggestion[] = []

  // Add authors
  nickValues.value.forEach((nick) => {
    const count = meta.values.nick[nick]
    suggestions.push({
      key: `nick-${nick}`,
      field: 'author',
      value: nick,
      ...(count !== undefined && { count }),
    })
  })

  // Add tags
  tagsValues.value.forEach((tag) => {
    const count = meta.values.tags[tag]
    suggestions.push({
      key: `tags-${tag}`,
      field: 'tags',
      value: tag,
      ...(count !== undefined && { count }),
    })
  })

  // Add years
  yearValues.value.forEach((year) => {
    const count = meta.values.year[year]
    suggestions.push({
      key: `year-${year}`,
      field: 'year',
      value: year,
      ...(count !== undefined && { count }),
    })
  })

  // Add months (case-insensitive autocomplete)
  months.forEach((month, index) => {
    suggestions.push({
      key: `month-${index + 1}`,
      field: 'month',
      value: month,
    })
  })

  // Add models
  modelValues.value.forEach((model) => {
    const count = meta.values.model[model]
    suggestions.push({
      key: `model-${model}`,
      field: 'model',
      value: model,
      ...(count !== undefined && { count }),
    })
  })

  // Add lenses
  lensValues.value.forEach((lens) => {
    const count = meta.values.lens[lens]
    suggestions.push({
      key: `lens-${lens}`,
      field: 'lens',
      value: lens,
      ...(count !== undefined && { count }),
    })
  })

  return suggestions
})

const onFilter = (val: string, update: (callback: () => void) => void) => {
  update(() => {
    if (!val || val.length < 2) {
      filteredSuggestions.value = []
      return
    }

    const lowerValue = val.toLowerCase()
    const colonIndex = lowerValue.indexOf(':')

    if (colonIndex > 0) {
      const fieldPart = lowerValue.substring(0, colonIndex).trim()
      const valuePart = lowerValue.substring(colonIndex + 1).trim()

      filteredSuggestions.value = allSuggestions.value
        .filter((s) => {
          const fieldMatch =
            s.field.toLowerCase().startsWith(fieldPart) ||
            (s.field === 'author' && 'nick'.startsWith(fieldPart))
          const valueMatch = valuePart === '' || s.value.toLowerCase().includes(valuePart)
          return fieldMatch && valueMatch
        })
        .slice(0, 20)
    } else {
      filteredSuggestions.value = allSuggestions.value
        .filter((s) => {
          return (
            s.field.toLowerCase().includes(lowerValue) || s.value.toLowerCase().includes(lowerValue)
          )
        })
        .slice(0, 20)
    }

    // Add explicit text search option if typed enough
    if (filteredSuggestions.value.length === 0 && lowerValue.length >= 3) {
      filteredSuggestions.value.push({
        key: 'text-search',
        field: 'title',
        value: val,
      })
    }
  })
}

const onSelect = (val: Suggestion[]) => {
  if (!val || val.length === 0) return

  // Get the last suggestion selected
  const suggestion = val[val.length - 1]
  if (!suggestion) return

  const field = suggestion.field === 'author' ? 'nick' : suggestion.field

  if (field === 'tags') {
    if (!tmp.value.tags) {
      tmp.value.tags = []
    }
    if (!tmp.value.tags.includes(suggestion.value)) {
      tmp.value.tags.push(suggestion.value)
    }
  } else if (field === 'month') {
    const monthIndex = months.findIndex((m) => m.toLowerCase() === suggestion.value.toLowerCase())
    if (monthIndex !== -1) {
      tmp.value.month = monthIndex + 1
    }
  } else if (field === 'year') {
    tmp.value.year = parseInt(suggestion.value)
  } else if (field === 'title') {
    tmp.value.text = suggestion.value
  } else {
    tmp.value[field as keyof FindType] = suggestion.value as never
  }

  searchInput.value = ''
  dummySelect.value = [] // clear current selections
  submit()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleKeyDownEnter = (e: KeyboardEvent) => {
  // If no suggestions are visible, we search in headlines
  if (filteredSuggestions.value.length === 0 && searchInput.value.length >= 3) {
    searchInHeadline()
  }
  // Otherwise, QSelect will handle it natively
}

const searchInHeadline = () => {
  if (searchInput.value && searchInput.value.length >= 3) {
    tmp.value.text = searchInput.value
    searchInput.value = ''
    submit()
  }
}

const getMonthName = (monthNum: number): string => {
  return months[monthNum - 1] || ''
}

const fixQuery = (query: FindType): FindType => {
  const sanitizedQuery = Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== null && value !== '')
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
  void router.push({
    path: '/list',
    query: tmp.value as LocationQueryRaw,
  })
}

const removeFilter = (field: keyof FindType) => {
  delete tmp.value[field]
  submit()
}

const removeTag = (tag: string) => {
  if (tmp.value.tags) {
    tmp.value.tags = tmp.value.tags.filter((t) => t !== tag)
    if (tmp.value.tags.length === 0) {
      delete tmp.value.tags
    }
    submit()
  }
}
const hasActiveFilters = computed(() => {
  return Object.keys(tmp.value).length > 0
})
</script>

<style scoped lang="scss">
.global-search {
  width: 100%;
  height: 100%;
  padding: 0;
}

.search-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.search-input {
  border-radius: 0;
  width: 100%;
  height: 100%;

  :deep(.q-field__control) {
    height: 100%;
    min-height: 50px;
    padding: 0;
  }

  :deep(.q-field__native) {
    min-width: 20px;
    padding: 8px 0;
  }

  .active-filters-row {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 4px;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  :deep(.q-chip) {
    margin: 2px;
    font-size: 13px;
    font-weight: 500;
    height: auto;
    min-height: 32px;
    color: var(--q-dark);
    background-color: var(--q-secondary);
  }

  :deep(.q-chip__content) {
    white-space: nowrap;
  }
}
</style>
