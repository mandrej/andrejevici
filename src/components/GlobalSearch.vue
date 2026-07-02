<template>
  <div class="relative flex-1 flex items-center min-w-0">
    <!-- Active filter chips row + input -->
    <div
      class="flex flex-1 flex-wrap items-center gap-1 min-h-[36px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-gray-900 transition-all"
    >
      <!-- Active filter chips -->
      <span v-if="tmp.text" class="chip" @click="removeFilter('text')">{{ tmp.text }}&nbsp;✕</span>
      <span v-if="tmp.kind" class="chip" @click="removeFilter('kind')">{{ tmp.kind }}&nbsp;✕</span>
      <template v-if="tmp.tags">
        <span v-for="tag in tmp.tags" :key="tag" class="chip" @click="removeTag(tag)">{{ tag }}&nbsp;✕</span>
      </template>
      <span v-if="tmp.year" class="chip" @click="removeFilter('year')">{{ tmp.year }}&nbsp;✕</span>
      <span v-if="tmp.month" class="chip" @click="removeFilter('month')">{{ getMonthName(tmp.month) }}&nbsp;✕</span>
      <span v-if="tmp.day" class="chip" @click="removeFilter('day')">{{ tmp.day }}&nbsp;✕</span>
      <span v-if="tmp.model" class="chip" @click="removeFilter('model')">{{ tmp.model }}&nbsp;✕</span>
      <span v-if="tmp.lens" class="chip" @click="removeFilter('lens')">{{ tmp.lens }}&nbsp;✕</span>
      <span v-if="tmp.nick" class="chip" @click="removeFilter('nick')">{{ tmp.nick }}&nbsp;✕</span>

      <!-- Text input -->
      <input
        v-model="searchInput"
        type="text"
        class="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
        :placeholder="hasActiveFilters ? '' : 'by tag: beograd year: 2022 etc…'"
        @keydown.enter="handleEnter"
        @input="onInput"
        @focus="showDropdown = true"
        @blur="onBlur"
      />

      <!-- Clear all button -->
      <button
        v-if="hasActiveFilters"
        type="button"
        class="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
        @click="clearAll"
        title="Clear all filters"
      >
        <span class="material-symbols-rounded text-xl">clear_all</span>
      </button>
    </div>

    <!-- Dropdown suggestions -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <ul
        v-if="showDropdown && filteredSuggestions.length > 0"
        class="absolute top-full left-0 right-0 mt-1 z-50 max-h-60 overflow-y-auto rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl py-1"
      >
        <li
          v-for="(sug, idx) in filteredSuggestions"
          :key="sug.key"
          :class="[
            'px-4 py-2 text-sm cursor-pointer select-none',
            activeIdx === idx
              ? 'bg-primary/10 text-primary'
              : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700',
          ]"
          @mousedown.prevent="onSelect(sug)"
        >
          <strong>{{ sug.field === 'title' ? 'title' : sug.field }}:</strong>
          {{ sug.value }}
        </li>
        <li v-if="searchInput.length >= 3 && filteredSuggestions.length === 0" class="px-4 py-2 text-sm text-gray-500">
          Press Enter to search in headlines for "{{ searchInput }}"
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { months } from '../helpers'
import type { FindType, Suggestion } from '../helpers/models'

const app = useAppStore()
const meta = useValuesStore()
const { find } = storeToRefs(app)
const { allSuggestions } = storeToRefs(meta)

const tmp = ref<FindType>({ ...(find.value as FindType) })
const searchInput = ref('')
const filteredSuggestions = ref<Suggestion[]>([])
const showDropdown = ref(false)
const activeIdx = ref(-1)

watch(find, (val) => { tmp.value = { ...(val as FindType) } }, { deep: true })

const hasActiveFilters = computed(() => Object.keys(tmp.value).length > 0)

const onInput = () => {
  activeIdx.value = -1
  const val = searchInput.value
  if (!val || val.length < 1) { filteredSuggestions.value = []; return }

  const lower = val.toLowerCase()
  const colonIdx = lower.indexOf(':')

  if (colonIdx > 0) {
    const fieldPart = lower.substring(0, colonIdx).trim()
    const valuePart = lower.substring(colonIdx + 1).trim()
    filteredSuggestions.value = allSuggestions.value
      .filter((s) => (s.field.toLowerCase().startsWith(fieldPart) || (s.field === 'author' && 'nick'.startsWith(fieldPart))) && (valuePart === '' || s.value.toLowerCase().includes(valuePart)))
      .slice(0, 20)
  } else {
    filteredSuggestions.value = allSuggestions.value
      .filter((s) => s.field.toLowerCase().includes(lower) || s.value.toLowerCase().includes(lower))
      .slice(0, 20)
  }

  if (filteredSuggestions.value.length === 0 && lower.length >= 3) {
    filteredSuggestions.value = [{ key: 'text-search', field: 'title', value: val }]
  }
  showDropdown.value = true
}

const onBlur = () => {
  setTimeout(() => { showDropdown.value = false }, 150)
}

const handleEnter = (e: KeyboardEvent) => {
  if (activeIdx.value >= 0 && filteredSuggestions.value[activeIdx.value]) {
    e.preventDefault()
    onSelect(filteredSuggestions.value[activeIdx.value])
    return
  }
  if (searchInput.value.length >= 3) {
    tmp.value.text = searchInput.value
    searchInput.value = ''
    filteredSuggestions.value = []
    showDropdown.value = false
    submit()
  }
}

const onSelect = (sug: Suggestion) => {
  const field = sug.field === 'author' ? 'nick' : sug.field
  if (field === 'tags') {
    if (!tmp.value.tags) tmp.value.tags = []
    if (!tmp.value.tags.includes(sug.value)) tmp.value.tags.push(sug.value)
  } else if (field === 'month') {
    const idx = months.findIndex((m) => m.toLowerCase() === sug.value.toLowerCase())
    if (idx !== -1) tmp.value.month = idx + 1
  } else if (field === 'day') {
    tmp.value.day = parseInt(sug.value)
  } else if (field === 'year') {
    tmp.value.year = parseInt(sug.value)
  } else if (field === 'title') {
    tmp.value.text = sug.value
  } else {
    tmp.value[field as keyof FindType] = sug.value as never
  }
  searchInput.value = ''
  filteredSuggestions.value = []
  showDropdown.value = false
  submit()
}

const getMonthName = (monthNum: number) => months[monthNum - 1] || ''

const removeFilter = (field: keyof FindType) => { delete tmp.value[field]; submit() }

const removeTag = (tag: string) => {
  if (tmp.value.tags) {
    tmp.value.tags = tmp.value.tags.filter((t) => t !== tag)
    if (tmp.value.tags.length === 0) delete tmp.value.tags
    submit()
  }
}

const clearAll = () => { tmp.value = {}; submit() }

const submit = () => { app.searchBy(tmp.value) }
</script>

<style lang="postcss" scoped>
@reference "../../styles/app.css";

.chip {
  @apply inline-flex items-center px-2 py-0.5 bg-secondary/20 text-secondary dark:text-secondary text-xs font-medium rounded-full cursor-pointer hover:bg-secondary/30 transition-colors select-none whitespace-nowrap;
}
</style>
