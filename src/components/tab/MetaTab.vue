<template>
  <q-banner class="q-pa-none q-px-md">
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
      <template v-slot:selected>
        {{ activeTabLabel }}
      </template>
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
      :label="`Search ${activeTabShort.toLowerCase()}`"
      :options="currentValueList"
      class="col"
    />
  </div>

  <q-table
    flat
    :rows="tableRows"
    :columns="columns"
    row-key="name"
    class="sticky-header-table q-mx-md q-mb-md"
    style="height: 60vh"
    :pagination="{ rowsPerPage: 0 }"
    hide-bottom
    binary-state-sort
  >
    <template v-slot:body-cell-name="props">
      <q-td
        :props="props"
        @click="
          app.searchBy({
            [app.metaTab]: app.metaTab === 'tags' ? [props.row.name] : props.row.name,
          })
        "
        class="cursor-pointer text-body1"
      >
        {{ props.row.name }}
      </q-td>
    </template>

    <template v-slot:body-cell-count="props">
      <q-td :props="props">
        <q-badge align="middle" class="bg-secondary text-body2 text-black">
          {{ props.row.count }}
        </q-badge>
      </q-td>
    </template>

    <template v-slot:body-cell-delete="props">
      <q-td :props="props">
        <q-btn
          v-if="app.metaTab === 'tags'"
          flat
          round
          dense
          color="negative"
          icon="sym_r_delete"
          @click="confirmDelete(props.row.name)"
          :disable="props.row.name === 'flash'"
        >
          <q-tooltip>Remove {{ activeTabLabel.toLowerCase().slice(0, -1) }}</q-tooltip>
        </q-btn>
      </q-td>
    </template>

    <template v-slot:body-cell-rename="props">
      <q-td :props="props">
        <q-btn
          flat
          round
          dense
          color="primary"
          icon="sym_r_edit"
          @click="openRenameDialog(props.row.name)"
          :disable="
            (app.metaTab === 'tags' && props.row.name === 'flash') ||
            (app.metaTab === 'model' && props.row.name === CONFIG.unknownModel)
          "
        >
          <q-tooltip>Rename {{ activeTabLabel.toLowerCase().slice(0, -1) }}</q-tooltip>
        </q-btn>
      </q-td>
    </template>
  </q-table>

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
            (val: string) => app.metaTab !== 'tags' || val.indexOf('/') === -1 || 'Cannot use / in tags',
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
        <div class="text-h6">Remove "{{ valueToDelete }}"</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        Are you sure you want to remove {{ activeTabShort.toLowerCase() }}
        <strong>"{{ valueToDelete }}"</strong>?<br />Operation can't be undone.
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
import CONFIG from 'src/config'

import {
  removeUnused,
  renameValue,
  deleteValue,
  addValue as addCounterValue,
} from '../../helpers/remedy'
import notify from '../../helpers/notify'
import type { QInput, QTableColumn } from 'quasar'

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
  search = ref('')

const showRenameDialog = ref(false)
const valueToRename = ref('')
const newTagName = ref('')

const showDeleteDialog = ref(false)
const valueToDelete = ref('')

const columns: QTableColumn[] = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'count', label: 'Count', field: 'count', align: 'right', sortable: true },
  { name: 'delete', label: '', field: 'delete', align: 'right' },
  { name: 'rename', label: '', field: 'rename', align: 'right' },
]

const tableRows = computed(() => {
  return filteredValues.value.map((val) => ({
    name: val,
    count: currentCounts.value[val] || 0,
  }))
})

const filteredValues = computed(() => {
  let list = [...currentValueList.value]

  if (search.value) {
    list = list.filter((v) => v.toLowerCase().includes(search.value.toLowerCase()))
  }

  return list
})

const isValueInUse = computed(() => {
  if (!newTagName.value) return false
  return (
    currentValueList.value.includes(newTagName.value) && newTagName.value !== valueToRename.value
  )
})

const addValue = async () => {
  if (newValue.value !== '' && currentValueList.value.indexOf(newValue.value) === -1) {
    try {
      await addCounterValue(app.metaTab, newValue.value)
      notify({
        type: 'positive',
        message: `${activeTabShort.value} "${newValue.value}" added`,
        icon: 'sym_r_check',
      })
      newValue.value = ''
    } catch (error) {
      notify({
        type: 'negative',
        message: `Failed to add ${activeTabShort.value.toLowerCase()}: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }
  if (newValueRef.value) {
    newValueRef.value.resetValidation()
  }
}

const confirmDelete = (val: string) => {
  if (app.metaTab === 'tags' && val === 'flash') {
    notify({ type: 'warning', message: 'Cannot remove "flash"' })
    return
  }
  if (app.metaTab === 'model' && val === CONFIG.unknownModel) {
    notify({ type: 'warning', message: `Cannot remove "${CONFIG.unknownModel}"` })
    return
  }
  valueToDelete.value = val
  showDeleteDialog.value = true
}

const removeValueAction = async () => {
  const val = valueToDelete.value
  showDeleteDialog.value = false
  try {
    await deleteValue(app.metaTab, val)
    await meta.countersBuild(app.metaTab)
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
    await meta.countersBuild(app.metaTab)
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
  if (app.metaTab === 'tags' && val === 'flash') return
  if (app.metaTab === 'model' && val === CONFIG.unknownModel) return

  valueToRename.value = val
  newTagName.value = val
  showRenameDialog.value = true
}

const performRename = async () => {
  if (valueToRename.value === '' || newTagName.value === '') return
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

  if (app.metaTab === 'model' && valueToRename.value === CONFIG.unknownModel) {
    notify({
      type: 'warning',
      message: `Cannot change "${CONFIG.unknownModel}"`,
    })
    return
  }

  try {
    const existing = valueToRename.value
    const changed = newTagName.value

    await renameValue(app.metaTab, existing, changed)
    await meta.countersBuild(app.metaTab)

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

<style scoped>
.sticky-header-table {
  height: 60vh;
}

:deep(.q-table__middle) {
  max-height: 100%;
}

:deep(.q-table__card) {
  display: flex;
  flex-direction: column;
}

:deep(.q-table thead tr th) {
  position: sticky;
  z-index: 1;
  top: 0;
  background-color: var(--q-my-page-bg);
  color: var(--q-my-text);
}

:deep(.q-field__native) {
  overflow: visible !important;
}
</style>
