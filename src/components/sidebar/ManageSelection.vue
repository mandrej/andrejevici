<template>
  <div style="background-color: var(--q-my-toolbar-bg)">
    <q-input
      v-if="user?.isAuthorized"
      v-model="headlineToApply"
      label="Headline to apply"
      class="q-px-md q-mb-md"
      clearable
      :dense="$q.screen.lt.sm"
    />
    <TagsMerge
      v-if="user?.isAuthorized"
      class="q-px-md q-mb-md"
      :label="`Tags to apply`"
      :dense="$q.screen.lt.sm"
    />

    <div
      v-if="selected.length > 0"
      class="q-px-md column"
      :class="{ 'q-gutter-sm': $q.screen.gt.sm }"
    >
      <div class="text-caption text-center">{{ selected.length }} items selected</div>
      <q-btn
        v-if="tagsToApply && tagsToApply.length > 0"
        flat
        align="right"
        label="Merge Tags"
        icon-right="sym_r_merge"
        @click="applyTags"
        :loading="busy"
      />
      <q-btn
        v-if="headlineToApply"
        flat
        align="right"
        label="Apply Headline"
        icon-right="sym_r_find_replace"
        @click="applyHeadline"
        :loading="busy"
      />
      <q-btn
        color="negative"
        align="right"
        label="Delete Selected"
        icon-right="sym_r_delete"
        @click="deleteSelected"
        :loading="busy"
      />
      <q-btn
        flat
        align="right"
        label="Clear Selection"
        icon-right="sym_r_clear_all"
        @click="clearSelected"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useUserStore } from '../../stores/user'
import { useValuesStore } from '../../stores/values'
import TagsMerge from '../TagsMerge.vue'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()

const { selected, busy } = storeToRefs(app)
const { user } = storeToRefs(auth)
const { headlineToApply, tagsToApply } = storeToRefs(meta)

/**
 * Merges `tagsToApply` into each selected photo record and saves the
 * updated records to Firestore, then clears the selection.
 */
const applyTags = async () => {
  for (const item of selected.value) {
    const rec = { ...item }
    rec.tags = Array.from(new Set([...(tagsToApply.value ?? []), ...(rec.tags ?? [])])).sort()
    await app.saveRecord(rec)
  }
  clearSelected()
}

/**
 * Overwrites the headline of every selected photo with `headlineToApply`
 * and saves each record to Firestore, then clears the selection.
 */
const applyHeadline = async () => {
  if (!headlineToApply.value) return
  for (const item of selected.value) {
    const rec = { ...item }
    rec.headline = headlineToApply.value
    await app.saveRecord(rec)
  }
  clearSelected()
}

/**
 * Deletes all currently selected photo records from Firestore and Storage,
 * then clears the selection.
 */
const deleteSelected = async () => {
  const toDelete = [...selected.value]
  for (const item of toDelete) {
    await app.deleteRecord(item)
  }
  clearSelected()
}

/**
 * Empties the `selected` array in the app store.
 */
const clearSelected = () => {
  selected.value = []
}
</script>
