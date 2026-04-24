<template>
  <PageTitle title="Tags" icon="sym_r_label">
    <template #action>
      <q-btn
        flat
        label="Remove unused tags"
        icon="sym_r_clear_all"
        @click="removeTags"
        color="primary"
        class="no-wrap"
      />
    </template>
  </PageTitle>

  <div class="row q-px-md">
    <div class="col-12">
      <div class="row no-wrap items-start">
        <q-input
          ref="newTagRef"
          v-model="newTag"
          label="Add new tag"
          :rules="[(val: string) => tagsValues.indexOf(val) === -1 || 'Tag already in use']"
          :dense="$q.screen.xs"
          clearable
          class="col"
        />
        <q-btn
          label="Add"
          @click="addTag"
          color="primary"
          class="q-ml-sm q-mt-sm"
          style="width: 100px"
        />
      </div>
    </div>
  </div>

  <div class="q-px-md row items-center no-wrap">
    <LocalSearch v-model="search" label="Search tags" :options="tagsValues" class="col" />
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

  <q-scroll-area class="q-pa-md" style="height: 65vh">
    <q-list separator :dense="$q.screen.xs">
      <q-item v-for="tag in filteredTags" :key="tag" class="q-px-none">
        <q-item-section @click="app.searchBy({ tags: [tag] })" class="cursor-pointer text-body1">
          <div class="row items-center text-body1">
            {{ tag }}
            <q-badge align="middle" class="bg-secondary text-body2 text-black q-ml-sm">
              {{ values.tags[tag] || 0 }}
            </q-badge>
          </div>
        </q-item-section>

        <q-item-section side>
          <div class="row no-wrap">
            <q-btn flat round color="negative" icon="sym_r_delete" @click="confirmRemoveTag(tag)">
              <q-tooltip>Remove tag</q-tooltip>
            </q-btn>
            <q-btn flat round color="primary" icon="sym_r_edit" @click="openRenameDialog(tag)">
              <q-tooltip>Rename tag</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-scroll-area>

  <q-dialog v-model="showRenameDialog" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Rename tag "{{ tagToRename }}"</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="newTagName"
          label="New tag name"
          autofocus
          clearable
          :rules="[
            (val: string) => !!val || 'Field is required',
            (val: string) => val.indexOf('/') === -1 || 'Cannot use / here',
          ]"
          @keyup.enter="performRename"
        >
          <template v-slot:hint>
            <span :class="isNewTagInUse ? 'text-negative' : 'text-positive'">
              {{ isNewTagInUse ? 'Tag name exists (will merge)' : 'Tag name available' }}
            </span>
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          flat
          :label="isNewTagInUse ? 'Merge' : 'Rename'"
          @click="performRename"
          :disable="!newTagName"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="showDeleteDialog" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Remove tag</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        Are you sure you want to remove tag <strong>"{{ tagToDelete }}"</strong>?<br />This will
        remove tag everywhere. Operation can't be undone.
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn flat label="Remove" color="negative" @click="removeTag" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useValuesStore } from '../../stores/values'
import PageTitle from '../PageTitle.vue'
import LocalSearch from '../LocalSearch.vue'

import { removeUnusedTags, renameValue, deleteTag } from '../../helpers/remedy'
import notify from '../../helpers/notify'
import type { QInput } from 'quasar'

const meta = useValuesStore()
const app = useAppStore()
const { tagsValues } = storeToRefs(meta)

const values = computed(() => meta.values)
const newTagRef = ref<InstanceType<typeof QInput> | null>(null),
  newTag = ref(''),
  search = ref(''),
  sortBy = ref<'name' | 'count'>('name'),
  sortOrder = ref<'asc' | 'desc'>('asc')

const showRenameDialog = ref(false)
const tagToRename = ref('')
const newTagName = ref('')

const showDeleteDialog = ref(false)
const tagToDelete = ref('')

const toggleSort = (type: 'name' | 'count') => {
  if (sortBy.value === type) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = type
    sortOrder.value = type === 'count' ? 'desc' : 'asc'
  }
}

const filteredTags = computed(() => {
  let tags = [...tagsValues.value]

  if (search.value) {
    tags = tags.filter((tag) => tag.toLowerCase().includes(search.value.toLowerCase()))
  }

  tags.sort((a, b) => {
    let result = 0
    if (sortBy.value === 'count') {
      const countA = values.value.tags[a] || 0
      const countB = values.value.tags[b] || 0
      result = countA - countB
    } else {
      result = a.localeCompare(b)
    }

    return sortOrder.value === 'desc' ? -result : result
  })

  return tags
})

const isNewTagInUse = computed(() => {
  if (!newTagName.value) return false
  return tagsValues.value.includes(newTagName.value) && newTagName.value !== tagToRename.value
})

const addTag = () => {
  if (newTag.value !== '' && tagsValues.value.indexOf(newTag.value) === -1) {
    values.value.tags[newTag.value] = 0
    newTag.value = ''
  }
  if (newTagRef.value) {
    newTagRef.value.resetValidation()
  }
}

const confirmRemoveTag = (tag: string) => {
  tagToDelete.value = tag
  showDeleteDialog.value = true
}

const removeTag = async () => {
  const tag = tagToDelete.value
  showDeleteDialog.value = false
  try {
    await deleteTag(tag)
    delete values.value.tags[tag]
    notify({
      type: 'positive',
      message: `Tag "${tag}" removed`,
      icon: 'sym_r_check',
    })
  } catch (error) {
    notify({
      type: 'negative',
      message: `Failed to remove tag: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

const removeTags = () => {
  try {
    removeUnusedTags()
    notify({
      type: 'positive',
      message: `Successfully removed unused tags`,
      icon: 'sym_r_check',
    })
  } catch (error) {
    notify({
      message: `Failed to remove unused tags: ${error instanceof Error ? error.message : String(error)}`,
      type: 'negative',
    })
  }
}

const openRenameDialog = (tag: string) => {
  tagToRename.value = tag
  newTagName.value = tag
  showRenameDialog.value = true
}

const performRename = async () => {
  if (tagToRename.value === '' || newTagName.value === '') return
  if (tagToRename.value === newTagName.value) {
    showRenameDialog.value = false
    return
  }

  if (tagToRename.value === 'flash') {
    notify({
      type: 'warning',
      message: `Cannot change "flash"`,
    })
    return
  }

  try {
    const existing = tagToRename.value
    const changed = newTagName.value

    await renameValue('tags', existing, changed)

    notify({
      type: 'positive',
      message: `${existing} successfully renamed to ${changed}`,
      icon: 'sym_r_check',
    })

    showRenameDialog.value = false
  } catch (error) {
    notify({
      message: `Failed to rename tag: ${error instanceof Error ? error.message : String(error)}`,
      type: 'negative',
    })
  }
}
</script>
