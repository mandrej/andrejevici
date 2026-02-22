<template>
  <Menu />
  <!-- <div
    class="q-ml-md q-pa-sm text-h4 text-right"
    :style="{ color: 'color-mix(in srgb, var(--q-my-text), transparent 70%)' }"
  >
    {{ counter }}
  </div> -->
  <q-space />

  <q-input
    v-if="user?.isAdmin"
    v-model="headlineToApply"
    label="Headline to apply"
    class="q-px-md q-mb-md"
    clearable
  />
  <TagsMerge v-if="user?.isAdmin" class="q-px-md q-mb-md" :label="`Tags to apply`" />

  <div v-if="user?.isAdmin && selected.length > 0" class="q-px-md column q-gutter-sm">
    <div class="text-caption text-center">{{ selected.length }} items selected</div>
    <q-btn
      v-if="tagsToApply && tagsToApply.length > 0"
      flat
      align="right"
      label="Merge Tags"
      @click="applyTags"
      :loading="busy"
    />
    <q-btn
      v-if="headlineToApply"
      flat
      align="right"
      label="Apply Headline"
      @click="applyHeadline"
      :loading="busy"
    />
    <q-btn
      color="negative"
      align="right"
      label="Delete Selected"
      @click="deleteSelected"
      :loading="busy"
    />
    <q-btn flat align="right" label="Clear Selection" @click="clearSelected" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'
import { useValuesStore } from 'src/stores/values'
import Menu from './Menu.vue'
import TagsMerge from './Tags-Merge.vue'
// import { computed } from 'vue'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()

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
  // We should create a copy because deleteRecord removes items from objects/selected
  const toDelete = [...selected.value]
  for (const item of toDelete) {
    await app.deleteRecord(item)
  }
  clearSelected()
}

// const counter = computed(() => {
//   return app.objects.length
// })

const clearSelected = () => {
  selected.value = []
}
</script>
