<template>
  <Menu />
  <q-space />
  <q-input
    v-if="user?.isAdmin && editMode"
    v-model="headlineToApply"
    label="Headline to apply"
    class="q-px-md q-mb-md"
    clearable
  />
  <TagsMerge v-if="user?.isAdmin && editMode" class="q-px-md q-mb-md" :label="`Tags to apply`" />

  <div v-if="user?.isAdmin && editMode && selected.length > 0" class="q-px-md column q-gutter-sm">
    <div class="text-caption text-center">{{ selected.length }} items selected</div>
    <q-btn
      v-if="tagsToApply && tagsToApply.length > 0"
      flat
      label="Apply Tags"
      @click="applyTags"
      :loading="busy"
    />
    <q-btn
      v-if="headlineToApply"
      flat
      label="Apply Headline"
      @click="applyHeadline"
      :loading="busy"
    />
    <q-btn color="negative" label="Delete Selected" @click="deleteSelected" :loading="busy" />
    <q-btn flat label="Clear Selection" @click="clearSelected" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'
import { useValuesStore } from 'src/stores/values'
import Menu from './Menu.vue'
import TagsMerge from './Tags-Merge.vue'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()

const { editMode, selected, busy } = storeToRefs(app)
const { user } = storeToRefs(auth)
const { headlineToApply, tagsToApply } = storeToRefs(meta)

const applyTags = async () => {
  for (const item of selected.value) {
    const rec = { ...item }
    rec.tags = Array.from(new Set([...(tagsToApply.value ?? []), ...(rec.tags ?? [])])).sort()
    await app.saveRecord(rec)
  }
  clearSelected()
}

const applyHeadline = async () => {
  if (!headlineToApply.value) return
  for (const item of selected.value) {
    const rec = { ...item }
    rec.headline = headlineToApply.value
    await app.saveRecord(rec)
  }
  clearSelected()
}

const deleteSelected = async () => {
  // We should create a copy because deleteRecord removes items from objects/selected
  const toDelete = [...selected.value]
  for (const item of toDelete) {
    await app.deleteRecord(item)
  }
  clearSelected()
}

const clearSelected = () => {
  selected.value = []
}
</script>
