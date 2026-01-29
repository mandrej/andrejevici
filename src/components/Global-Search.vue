<template>
  <div class="global-search">
    <div class="search-wrapper">
      <q-input
        v-model="searchInput"
        placeholder="Search: tags: milan, year: 2025, model: canon..."
        borderless
        clearable
        class="search-input"
        @clear="clearSearch"
        @keydown.enter.prevent="handleKeyboardSelect"
        @keydown.arrow-down.prevent="navigateDown"
        @keydown.arrow-up.prevent="navigateUp"
        @keydown.escape="closeMenu"
        @update:model-value="(val) => updateSuggestions(String(val ?? ''))"
      >
        <template #prepend>
          <q-icon name="search" />

          <!-- Active Filters as Chips Inside Input -->
          <q-chip
            v-if="tmp.text"
            removable
            color="primary"
            text-color="white"
            @remove="removeFilter('text')"
          >
            {{ tmp.text }}
          </q-chip>

          <q-chip
            v-for="tag in tmp.tags"
            :key="tag"
            removable
            color="primary"
            text-color="white"
            @remove="removeTag(tag)"
          >
            {{ tag }}
          </q-chip>

          <q-chip
            v-if="tmp.year"
            removable
            color="primary"
            text-color="white"
            @remove="removeFilter('year')"
          >
            {{ tmp.year }}
          </q-chip>

          <q-chip
            v-if="tmp.month"
            removable
            color="primary"
            text-color="white"
            @remove="removeFilter('month')"
          >
            {{ getMonthName(tmp.month) }}
          </q-chip>

          <q-chip
            v-if="tmp.model"
            removable
            color="primary"
            text-color="white"
            @remove="removeFilter('model')"
          >
            {{ tmp.model }}
          </q-chip>

          <q-chip
            v-if="tmp.lens"
            removable
            color="primary"
            text-color="white"
            @remove="removeFilter('lens')"
          >
            {{ tmp.lens }}
          </q-chip>

          <q-chip
            v-if="tmp.nick"
            removable
            color="primary"
            text-color="white"
            @remove="removeFilter('nick')"
          >
            {{ tmp.nick }}
          </q-chip>
        </template>

        <template #append>
          <q-btn v-if="hasActiveFilters" flat dense round icon="clear_all" @click="clearAllFilters">
            <q-tooltip>Clear all filters</q-tooltip>
          </q-btn>
        </template>
      </q-input>

      <!-- Autocomplete Suggestions -->
      <q-menu v-model="showSuggestions" no-parent-event :offset="[0, 5]" class="suggestions-menu">
        <q-list dense>
          <q-item
            v-for="(suggestion, index) in filteredSuggestions"
            :key="suggestion.key"
            clickable
            v-close-popup
            @click="selectSuggestion(suggestion)"
            @mouseenter="selectedIndex = index"
          >
            <q-item-section avatar>
              <q-icon :name="getFieldIcon(suggestion.field)" size="sm" />
            </q-item-section>
            <q-item-section>
              <q-item-label v-if="suggestion.field === 'title'">
                <strong>title:</strong> {{ suggestion.value }}
              </q-item-label>
              <q-item-label v-else>
                <strong>{{ suggestion.field }}:</strong> {{ suggestion.value }}
              </q-item-label>
              <q-item-label caption v-if="suggestion.count">
                {{ suggestion.count }} photo{{ suggestion.count > 1 ? 's' : '' }}
              </q-item-label>
              <q-item-label caption v-else-if="suggestion.field === 'title'">
                Search in headlines
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
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
const showSuggestions = ref(false)
const filteredSuggestions = ref<Suggestion[]>([])
const selectedIndex = ref(-1)

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

const updateSuggestions = (value: string) => {
  if (!value || value.length < 2) {
    showSuggestions.value = false
    filteredSuggestions.value = []
    selectedIndex.value = -1
    return
  }

  const lowerValue = value.toLowerCase()

  // Check if input contains field prefix (e.g., "tags:", "year:")
  const colonIndex = lowerValue.indexOf(':')

  if (colonIndex > 0) {
    // User specified a field
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
    // Search across all fields
    filteredSuggestions.value = allSuggestions.value
      .filter((s) => {
        return (
          s.field.toLowerCase().includes(lowerValue) || s.value.toLowerCase().includes(lowerValue)
        )
      })
      .slice(0, 20)
  }

  // If no suggestions found and enough characters typed, add a text search option
  if (filteredSuggestions.value.length === 0 && lowerValue.length >= 3) {
    filteredSuggestions.value.push({
      key: 'text-search',
      field: 'title',
      value: value,
    })
  }

  selectedIndex.value = -1
  showSuggestions.value = filteredSuggestions.value.length > 0
}

const selectSuggestion = (suggestion: Suggestion) => {
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
  showSuggestions.value = false
  selectedIndex.value = -1
  submit()
}

const navigateDown = () => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return

  if (selectedIndex.value < filteredSuggestions.value.length - 1) {
    selectedIndex.value++
  } else {
    selectedIndex.value = 0
  }
}

const navigateUp = () => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return

  if (selectedIndex.value > 0) {
    selectedIndex.value--
  } else {
    selectedIndex.value = filteredSuggestions.value.length - 1
  }
}

const handleKeyboardSelect = () => {
  if (
    showSuggestions.value &&
    selectedIndex.value >= 0 &&
    selectedIndex.value < filteredSuggestions.value.length
  ) {
    const suggestion = filteredSuggestions.value[selectedIndex.value]
    if (suggestion) {
      selectSuggestion(suggestion)
    }
  } else {
    handleAddFilter()
  }
}

const closeMenu = () => {
  showSuggestions.value = false
  selectedIndex.value = -1
}

const handleAddFilter = () => {
  if (!searchInput.value || searchInput.value.length < 3) return

  // Try to parse the input
  const colonIndex = searchInput.value.indexOf(':')

  if (colonIndex > 0) {
    const fieldPart = searchInput.value.substring(0, colonIndex).trim().toLowerCase()
    const valuePart = searchInput.value.substring(colonIndex + 1).trim()

    // Map field aliases
    const fieldMap: { [key: string]: keyof FindType } = {
      tag: 'tags',
      tags: 'tags',
      year: 'year',
      month: 'month',
      model: 'model',
      lens: 'lens',
      author: 'nick',
      nick: 'nick',
      title: 'text',
      text: 'text',
    }

    const field = fieldMap[fieldPart]

    if (field && valuePart) {
      if (field === 'tags') {
        if (!tmp.value.tags) {
          tmp.value.tags = []
        }
        if (!tmp.value.tags.includes(valuePart)) {
          tmp.value.tags.push(valuePart)
        }
      } else if (field === 'month') {
        const monthIndex = months.findIndex((m) => m.toLowerCase() === valuePart.toLowerCase())
        if (monthIndex !== -1) {
          tmp.value.month = monthIndex + 1
        }
      } else if (field === 'year') {
        const num = parseInt(valuePart)
        if (!isNaN(num)) {
          tmp.value.year = num
        }
      } else {
        tmp.value[field] = valuePart as never
      }

      searchInput.value = ''
      showSuggestions.value = false
      submit()
      return
    }
  }

  // If no field specified or not found, search in headline
  searchInHeadline()
}

const searchInHeadline = () => {
  if (searchInput.value && searchInput.value.length >= 3) {
    tmp.value.text = searchInput.value
    searchInput.value = ''
    showSuggestions.value = false
    submit()
  }
}

const getFieldIcon = (field: string): string => {
  const icons: { [key: string]: string } = {
    tags: 'label',
    year: 'event',
    month: 'calendar_month',
    model: 'camera',
    lens: 'camera_alt',
    author: 'person',
    nick: 'person',
    title: 'title',
    text: 'title',
  }
  return icons[field] || 'search'
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

const clearSearch = () => {
  searchInput.value = ''
  showSuggestions.value = false
  selectedIndex.value = -1
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

const clearAllFilters = () => {
  tmp.value = {}
  searchInput.value = ''
  submit()
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
    padding: 0 16px;
  }

  :deep(.q-field__native) {
    padding: 8px 0;
  }

  // :deep(.q-placeholder) {
  //   color: currentColor;
  //   opacity: 0.5;
  // }

  :deep(.q-field__append),
  :deep(.q-field__prepend) {
    height: 100%;
    display: flex;
    align-items: center;
  }

  :deep(.q-field__prepend) {
    gap: 8px;
    flex-wrap: nowrap;
  }

  :deep(.q-chip) {
    margin: 2px;
    font-size: 13px;
    font-weight: 500;
    padding: 8px 12px;
    height: auto;
    min-height: 32px;
  }

  :deep(.q-chip__content) {
    white-space: nowrap;
  }
}

.suggestions-menu {
  max-height: 400px;
  overflow-y: auto;

  :deep(.q-item.bg-grey-8) {
    background-color: rgba(255, 255, 255, 0.15);
    transition: background-color 0.2s ease;
  }

  :deep(.q-item:hover) {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
