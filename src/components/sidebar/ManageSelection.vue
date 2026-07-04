<template>
  <div class="bg-light dark:bg-dark p-2">
    <div v-if="user?.isAuthorized" class="px-2 mb-4">
      <AppInput v-model="headlineToApply" label="Headline to apply" clearable />
    </div>
    <TagsMerge v-if="user?.isAuthorized" class="px-2 mb-4" :label="`Tags to apply`" />

    <div
      v-if="selected.length > 0"
      class="px-2 flex flex-col gap-2"
      :class="{ 'gap-3': screen.gtSm }"
    >
      <div class="text-xs text-center text-gray-500">{{ selected.length }} items selected</div>

      <AppButton
        v-if="tagsToApply && tagsToApply.length > 0"
        flat
        label="Merge Tags"
        icon="sym_r_merge"
        @click="applyTags"
        :disabled="busy"
        class="justify-end"
      />
      <AppButton
        v-if="headlineToApply"
        flat
        label="Apply Headline"
        icon="sym_r_find_replace"
        @click="applyHeadline"
        :disabled="busy"
        class="justify-end"
      />
      <AppButton
        color="negative"
        label="Delete Selected"
        icon="sym_r_delete"
        @click="deleteSelected"
        :disabled="busy"
        class="justify-end"
      />
      <AppButton
        flat
        label="Clear Selection"
        icon="sym_r_clear_all"
        @click="clearSelected"
        class="justify-end"
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
import AppButton from '../atoms/AppButton.vue'
import AppInput from '../atoms/AppInput.vue'
import { useScreen } from '../../composables/useScreen'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const screen = useScreen()

const { selected, busy } = storeToRefs(app)
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
