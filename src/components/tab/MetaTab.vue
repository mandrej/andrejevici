<template>
  <q-banner class="q-pa-none q-pl-md">
    <template v-slot:avatar>
      <q-icon :name="activeTabIcon" class="q-py-md" />
    </template>
    <q-select
      v-model="app.metaTab"
      :options="app.metaOptions"
      emit-value
      map-options
      borderless
      class="text-h6"
    >
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section avatar>
            <q-icon :name="scope.opt.icon" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
  </q-banner>

  <div class="row q-px-md q-pt-sm">
    <div class="col-12">
      <div class="row no-wrap items-start">
        <q-input
          ref="newValueRef"
          v-model="newValue"
          :label="`Add new ${activeTabShort.toLowerCase()}`"
          :rules="[(val: string) => currentValueList.indexOf(val) === -1 || 'Already exists']"
          :dense="$q.screen.xs"
          clearable
          class="col"
        />
        <q-btn
          label="Add"
          @click="addValue"
          color="primary"
          class="q-ml-sm q-mt-sm"
          style="width: 100px"
        />
        <q-btn
          flat
          label="Remove unused"
          icon="sym_r_clear_all"
          @click="removeUnusedValues"
          color="primary"
          class="q-ml-sm q-mt-sm no-wrap"
        >
          <q-tooltip>Remove unused {{ activeTabLabel.toLowerCase() }}</q-tooltip>
        </q-btn>
      </div>
    </div>
  </div>

  <div class="q-px-md row items-center no-wrap">
    <LocalSearch
      v-model="search"
      :label="`Search ${activeTabLabel.toLowerCase()}`"
      :options="currentValueList"
      class="col"
    />
    <q-btn
      flat
      round
      dense
      :color="sortBy === 'count' ? 'primary' : 'grey-7'"
      icon="sym_r_bar_chart"
      @click="toggleSort('count')"
      class="q-ml-sm"
    >
      <q-tooltip>Sort by count</q-tooltip>
    </q-btn>
    <q-btn
      flat
      round
      dense
      :color="sortBy === 'name' ? 'primary' : 'grey-7'"
      icon="sym_r_sort_by_alpha"
      @click="toggleSort('name')"
      class="q-ml-xs"
    >
      <q-tooltip>Sort by name</q-tooltip>
    </q-btn>
    <q-btn
      flat
      round
      dense
      :icon="sortOrder === 'desc' ? 'sym_r_arrow_downward' : 'sym_r_arrow_upward'"
      @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
      class="q-ml-xs"
    >
      <q-tooltip>{{ sortOrder === 'desc' ? 'Descending' : 'Ascending' }}</q-tooltip>
    </q-btn>
  </div>

  <q-scroll-area class="q-pa-md" style="height: 60vh">
    <q-list separator :dense="$q.screen.xs">
      <q-item v-for="val in filteredValues" :key="val" class="q-px-none">
        <q-item-section
          @click="app.searchBy({ [app.metaTab]: app.metaTab === 'tags' ? [val] : val })"
          class="cursor-pointer text-body1"
        >
          <div class="row items-center text-body1">
            {{ val }}
            <q-badge align="middle" class="bg-secondary text-body2 text-black q-ml-sm">
              {{ currentCounts[val] || 0 }}
            </q-badge>
          </div>
        </q-item-section>

        <q-item-section side>
          <div class="row no-wrap">
            <q-btn flat round color="negative" icon="sym_r_delete" @click="confirmDelete(val)">
              <q-tooltip>Remove {{ activeTabLabel.toLowerCase().slice(0, -1) }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="app.metaTab !== 'model'"
              flat
              round
              color="primary"
              icon="sym_r_edit"
              @click="openRenameDialog(val)"
            >
              <q-tooltip>Rename {{ activeTabLabel.toLowerCase().slice(0, -1) }}</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-scroll-area>

  <q-dialog v-model="showRenameDialog" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Rename {{ activeTabShort.toLowerCase() }} "{{ valueToRename }}"</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="newTagName"
          :label="`New ${activeTabShort.toLowerCase()} name`"
          autofocus
          clearable
          :rules="[
            (val: string) => !!val || 'Field is required',
            (val: string) => val.indexOf('/') === -1 || 'Cannot use / here',
          ]"
          @keyup.enter="performRename"
        >
          <template v-slot:hint>
            <span :class="isValueInUse ? 'text-negative' : 'text-positive'">
              {{ isValueInUse ? 'Name exists (will merge)' : 'Name available' }}
            </span>
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          flat
          :label="isValueInUse ? 'Merge' : 'Rename'"
          @click="performRename"
          :disable="!newTagName"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="showDeleteDialog" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Remove {{ valueToDelete }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        Are you sure you want to remove {{ activeTabShort.toLowerCase() }}
        <strong>"{{ valueToDelete }}"</strong>?<br />This will remove it everywhere. Operation can't
        be undone.
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn flat label="Remove" color="negative" @click="removeValueAction" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../../stores/app'
import { useValuesStore } from '../../stores/values'
import LocalSearch from '../LocalSearch.vue'

import { removeUnused, renameValue, deleteValue } from '../../helpers/remedy'
import notify from '../../helpers/notify'
import type { QInput } from 'quasar'

const meta = useValuesStore()
const app = useAppStore()

const activeTabLabel = computed(() => {
  return app.metaOptions.find((opt) => opt.value === app.metaTab)?.label || 'Metadata'
})
const activeTabShort = computed(() => {
  return app.metaOptions.find((opt) => opt.value === app.metaTab)?.short || 'Value'
})
const activeTabIcon = computed(() => {
  return app.metaOptions.find((opt) => opt.value === app.metaTab)?.icon || 'sym_r_settings'
})

const values = computed(() => meta.values)
const currentCounts = computed(() => values.value[app.metaTab] || {})
const currentValueList = computed(() => Object.keys(currentCounts.value).sort())

const newValueRef = ref<InstanceType<typeof QInput> | null>(null),
  newValue = ref(''),
  search = ref(''),
  sortBy = ref<'name' | 'count'>('name'),
  sortOrder = ref<'asc' | 'desc'>('asc')

const showRenameDialog = ref(false)
const valueToRename = ref('')
const newTagName = ref('')

const showDeleteDialog = ref(false)
const valueToDelete = ref('')

const toggleSort = (type: 'name' | 'count') => {
  if (sortBy.value === type) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = type
    sortOrder.value = type === 'count' ? 'desc' : 'asc'
  }
}

const filteredValues = computed(() => {
  let list = [...currentValueList.value]

  if (search.value) {
    list = list.filter((v) => v.toLowerCase().includes(search.value.toLowerCase()))
  }

  list.sort((a, b) => {
    let result = 0
    if (sortBy.value === 'count') {
      const countA = currentCounts.value[a] || 0
      const countB = currentCounts.value[b] || 0
      result = countA - countB
    } else {
      result = a.localeCompare(b)
    }

    return sortOrder.value === 'desc' ? -result : result
  })

  return list
})

const isValueInUse = computed(() => {
  if (!newTagName.value) return false
  return (
    currentValueList.value.includes(newTagName.value) && newTagName.value !== valueToRename.value
  )
})

const addValue = () => {
  if (newValue.value !== '' && currentValueList.value.indexOf(newValue.value) === -1) {
    values.value[app.metaTab][newValue.value] = 0
    newValue.value = ''
  }
  if (newValueRef.value) {
    newValueRef.value.resetValidation()
  }
}

const confirmDelete = (val: string) => {
  valueToDelete.value = val
  showDeleteDialog.value = true
}

const removeValueAction = async () => {
  const val = valueToDelete.value
  showDeleteDialog.value = false
  try {
    await deleteValue(app.metaTab, val)
    delete values.value[app.metaTab][val]
    notify({
      type: 'positive',
      message: `${activeTabShort.value} "${val}" removed`,
      icon: 'sym_r_check',
    })
  } catch (error) {
    notify({
      type: 'negative',
      message: `Failed to remove ${activeTabShort.value.toLowerCase()}: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

const removeUnusedValues = async () => {
  try {
    await removeUnused(app.metaTab)
    notify({
      type: 'positive',
      message: `Successfully removed unused ${activeTabLabel.value.toLowerCase()}`,
      icon: 'sym_r_check',
    })
  } catch (error) {
    notify({
      message: `Failed to remove unused ${activeTabLabel.value.toLowerCase()}: ${error instanceof Error ? error.message : String(error)}`,
      type: 'negative',
    })
  }
}

const openRenameDialog = (val: string) => {
  valueToRename.value = val
  newTagName.value = val
  showRenameDialog.value = true
}

const performRename = async () => {
  if (valueToRename.value === '' || newTagName.value === '' || app.metaTab === 'model') return
  if (valueToRename.value === newTagName.value) {
    showRenameDialog.value = false
    return
  }

  if (app.metaTab === 'tags' && valueToRename.value === 'flash') {
    notify({
      type: 'warning',
      message: `Cannot change "flash"`,
    })
    return
  }

  try {
    const existing = valueToRename.value
    const changed = newTagName.value

    await renameValue(app.metaTab, existing, changed)

    notify({
      type: 'positive',
      message: `${existing} successfully renamed to ${changed}`,
      icon: 'sym_r_check',
    })

    showRenameDialog.value = false
  } catch (error) {
    notify({
      message: `Failed to rename: ${error instanceof Error ? error.message : String(error)}`,
      type: 'negative',
    })
  }
}
</script>
