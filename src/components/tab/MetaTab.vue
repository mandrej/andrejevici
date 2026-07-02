<template>
  <!-- Header: tab selector -->
  <div class="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <AppIcon :name="activeTabIcon" class="w-5 h-5 text-primary" />
    <AppSelect
      v-model="app.metaTab"
      :options="metaOptions.map(o => ({ label: o.label, value: o.value }))"
      class="flex-1 max-w-xs"
    />
  </div>

  <!-- Add new value + rebuild -->
  <div class="flex gap-2 px-4 pt-3 items-start">
    <div class="flex-1">
      <AppInput
        ref="newValueInputRef"
        v-model="newValue"
        :label="`Add new ${activeTabShort.toLowerCase()}`"
        clearable
      />
      <p v-if="newValue && currentValueList.includes(newValue)" class="text-xs text-negative mt-1">Already exists</p>
    </div>
    <AppButton label="Add" @click="addValue" color="primary" class="mt-1" />
    <AppButton
      flat
      icon="build"
      label="Rebuild"
      @click="rebuildCounts"
      color="primary"
      class="mt-1 whitespace-nowrap"
      :title="`Rebuild ${app.metaTab.toLowerCase()} counts`"
    />
  </div>

  <!-- Search -->
  <div class="px-4 py-2">
    <LocalSearch
      v-model="search"
      :label="`Search ${activeTabShort.toLowerCase()}`"
      :options="currentValueList"
    />
  </div>

  <!-- Data table -->
  <div class="overflow-auto mx-4 mb-4 border border-gray-200 dark:border-gray-700 rounded-lg" style="height: 58vh">
    <table class="w-full text-sm border-collapse">
      <thead class="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
        <tr>
          <th class="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none" @click="toggleSort('name')">
            Name <span class="text-xs">{{ sortField === 'name' ? (sortAsc ? '↑' : '↓') : '' }}</span>
          </th>
          <th class="text-right px-3 py-2 font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none" @click="toggleSort('count')">
            Count <span class="text-xs">{{ sortField === 'count' ? (sortAsc ? '↑' : '↓') : '' }}</span>
          </th>
          <th class="px-3 py-2 w-10" />
          <th class="px-3 py-2 w-10" />
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr
          v-for="row in sortedRows"
          :key="row.name"
          class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <td
            class="px-3 py-2 cursor-pointer text-primary hover:underline"
            @click="app.searchBy({ [app.metaTab]: app.metaTab === 'tags' ? [row.name] : row.name })"
          >{{ row.name }}</td>
          <td class="px-3 py-2 text-right">
            <AppBadge color="secondary" textColor="black" class="text-xs">{{ row.count }}</AppBadge>
          </td>
          <td class="px-3 py-2 text-right">
            <button
              v-if="app.metaTab === 'tags'"
              class="text-negative hover:opacity-80 transition-opacity disabled:opacity-30"
              :disabled="row.name === 'flash'"
              :title="`Remove ${activeTabShort.toLowerCase()}`"
              @click="confirmDelete(row.name)"
            >
              <AppIcon name="delete" class="w-5 h-5" />
            </button>
          </td>
          <td class="px-3 py-2 text-right">
            <button
              class="text-primary hover:opacity-80 transition-opacity disabled:opacity-30"
              :disabled="(app.metaTab === 'tags' && row.name === 'flash') || (app.metaTab === 'model' && row.name === CONFIG.unknownModel)"
              :title="`Rename ${activeTabShort.toLowerCase()}`"
              @click="openRenameDialog(row.name)"
            >
              <AppIcon name="edit" class="w-5 h-5" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Rename Dialog -->
  <AppDialog v-model="showRenameDialog" max-width="max-w-sm">
    <div class="p-6">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">
        Rename {{ activeTabShort.toLowerCase() }} "{{ valueToRename }}"
      </h2>
      <AppInput
        v-model="newTagName"
        :label="`New ${activeTabShort.toLowerCase()} name`"
        autofocus
        clearable
        @keyup.enter="performRename"
      />
      <p v-if="newTagName" :class="['text-xs mt-1', isValueInUse ? 'text-negative' : 'text-positive']">
        {{ isValueInUse ? 'Name exists (will merge)' : 'Name available' }}
      </p>
      <div class="flex justify-end gap-3 mt-6">
        <AppButton flat label="Cancel" @click="showRenameDialog = false" />
        <AppButton
          flat
          :label="isValueInUse ? 'Merge' : 'Rename'"
          @click="performRename"
          :disabled="!newTagName"
        />
      </div>
    </div>
  </AppDialog>

  <!-- Delete Dialog -->
  <AppDialog v-model="showDeleteDialog" max-width="max-w-sm">
    <div class="p-6">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-2">
        Remove "{{ valueToDelete }}"
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Are you sure you want to remove {{ activeTabShort.toLowerCase() }}
        <strong>"{{ valueToDelete }}"</strong>?<br />Operation can't be undone.
      </p>
      <div class="flex justify-end gap-3">
        <AppButton flat label="Cancel" @click="showDeleteDialog = false" />
        <AppButton flat label="Remove" color="negative" @click="removeValueAction" />
      </div>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../../stores/app'
import { useValuesStore } from '../../stores/values'
import LocalSearch from '../LocalSearch.vue'
import CONFIG from '../../config'
import AppInput from '../atoms/AppInput.vue'
import AppButton from '../atoms/AppButton.vue'
import AppBadge from '../atoms/AppBadge.vue'
import AppSelect from '../atoms/AppSelect.vue'
import AppDialog from '../atoms/AppDialog.vue'

import { renameValue, deleteValue, addValue as addCounterValue } from '../../helpers/remedy'
import notify from '../../helpers/notify'
import type { MetaOption } from '../../helpers/models'
import AppIcon from '../atoms/AppIcon.vue'

const meta = useValuesStore()
const app = useAppStore()

const metaOptions: MetaOption[] = [
  { label: 'Manage Kinds', value: 'kind', icon: 'sym_r_category', short: 'Kind' },
  { label: 'Manage Tags', value: 'tags', icon: 'sym_r_label', short: 'Tag' },
  { label: 'Manage Cameras', value: 'model', icon: 'sym_r_photo_camera', short: 'Camera' },
  { label: 'Manage Lenses', value: 'lens', icon: 'sym_r_camera', short: 'Lens' },
]

const activeTabShort = computed(() => metaOptions.find((o) => o.value === app.metaTab)?.short || 'Value')
const activeTabIcon = computed(() => metaOptions.find((o) => o.value === app.metaTab)?.icon || 'settings')

const values = computed(() => meta.values)
const currentCounts = computed(() => values.value[app.metaTab] || {})
const currentValueList = computed(() => Object.keys(currentCounts.value).sort())

const newValueInputRef = ref<HTMLInputElement | null>(null)
const newValue = ref('')
const search = ref('')

const showRenameDialog = ref(false)
const valueToRename = ref('')
const newTagName = ref('')
const showDeleteDialog = ref(false)
const valueToDelete = ref('')

// Client-side sort
type SortField = 'name' | 'count'
const sortField = ref<SortField>('count')
const sortAsc = ref(false)
const toggleSort = (field: SortField) => {
  if (sortField.value === field) sortAsc.value = !sortAsc.value
  else { sortField.value = field; sortAsc.value = false }
}

const tableRows = computed(() => {
  let list = currentValueList.value
  if (search.value) list = list.filter((v) => v.toLowerCase().includes(search.value.toLowerCase()))
  return list.map((val) => ({ name: val, count: currentCounts.value[val] || 0 }))
})

const sortedRows = computed(() => {
  const rows = [...tableRows.value]
  rows.sort((a, b) => {
    const dir = sortAsc.value ? 1 : -1
    if (sortField.value === 'name') return a.name.localeCompare(b.name) * dir
    return (a.count - b.count) * dir
  })
  return rows
})

const isValueInUse = computed(() =>
  !!(newTagName.value && currentValueList.value.includes(newTagName.value) && newTagName.value !== valueToRename.value)
)

const addValue = async () => {
  if (newValue.value !== '' && !currentValueList.value.includes(newValue.value)) {
    try {
      await addCounterValue(app.metaTab, newValue.value)
      notify({ type: 'positive', message: `${activeTabShort.value} "${newValue.value}" added`, icon: 'sym_r_check' })
      newValue.value = ''
    } catch (error) {
      notify({ type: 'negative', message: `Failed to add: ${error instanceof Error ? error.message : String(error)}` })
    }
  }
}

const confirmDelete = (val: string) => {
  if (app.metaTab === 'tags' && val === 'flash') { notify({ type: 'warning', message: 'Cannot remove "flash"' }); return }
  if (app.metaTab === 'model' && val === CONFIG.unknownModel) { notify({ type: 'warning', message: `Cannot remove "${CONFIG.unknownModel}"` }); return }
  valueToDelete.value = val
  showDeleteDialog.value = true
}

const removeValueAction = async () => {
  const val = valueToDelete.value
  showDeleteDialog.value = false
  try {
    await deleteValue(app.metaTab, val)
    await meta.countersBuild(app.metaTab)
    notify({ type: 'positive', message: `${activeTabShort.value} "${val}" removed`, icon: 'sym_r_check' })
  } catch (error) {
    notify({ type: 'negative', message: `Failed to remove: ${error instanceof Error ? error.message : String(error)}` })
  }
}

const rebuildCounts = async () => {
  try {
    await meta.countersBuild(app.metaTab)
    notify({ type: 'positive', message: `Successfully rebuilt ${app.metaTab} counts`, icon: 'sym_r_check' })
  } catch (error) {
    notify({ message: `Failed to rebuild: ${error instanceof Error ? error.message : String(error)}`, type: 'negative' })
  }
}

const openRenameDialog = (val: string) => {
  if (app.metaTab === 'tags' && val === 'flash') return
  if (app.metaTab === 'model' && val === CONFIG.unknownModel) return
  valueToRename.value = val
  newTagName.value = val
  showRenameDialog.value = true
}

const performRename = async () => {
  if (!valueToRename.value || !newTagName.value) return
  if (valueToRename.value === newTagName.value) { showRenameDialog.value = false; return }
  if (app.metaTab === 'tags' && valueToRename.value === 'flash') { notify({ type: 'warning', message: 'Cannot change "flash"' }); return }
  if (app.metaTab === 'model' && valueToRename.value === CONFIG.unknownModel) { notify({ type: 'warning', message: `Cannot change "${CONFIG.unknownModel}"` }); return }

  try {
    await renameValue(app.metaTab, valueToRename.value, newTagName.value)
    await meta.countersBuild(app.metaTab)
    notify({ type: 'positive', message: `${valueToRename.value} renamed to ${newTagName.value}`, icon: 'sym_r_check' })
    showRenameDialog.value = false
  } catch (error) {
    notify({ message: `Failed to rename: ${error instanceof Error ? error.message : String(error)}`, type: 'negative' })
  }
}
</script>
