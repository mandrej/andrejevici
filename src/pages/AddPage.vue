<template>
  <!-- Page header banner -->
  <div
    class="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
  >
    <AppIcon :name="addTab === 'photo' ? 'upload' : 'video_library'" class="w-6 h-6 text-primary" />
    <span class="text-lg font-semibold text-gray-900 dark:text-white">
      {{ addTab === 'photo' ? 'Upload / publish images' : 'Link videos' }}
    </span>
  </div>

  <template v-if="canAddPhoto">
    <!-- Tab panels driven by addTab store -->
    <div class="p-4">
      <PhotoTab v-if="addTab === 'photo'" />
      <VideoTab v-else-if="addTab === 'video'" />
    </div>

    <!-- Headline + tags inputs -->
    <div
      class="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 bg-gray-50 dark:bg-gray-800"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppInput
          v-model="headlineToApply"
          label="Headline to apply"
          :placeholder="`If empty, '${CONFIG.noTitle}' is used`"
          clearable
        />
        <TagsMerge :label="`Tags to apply`" :hint="`You can add / remove tag later`" />
      </div>
    </div>
  </template>

  <div v-else class="p-4 text-center">
    <div
      class="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 text-amber-800 dark:text-amber-200"
    >
      <AppIcon name="warning" class="w-6 h-6 shrink-0" />
      <span class="text-sm">Only authorized users with a defined nickname can upload photos.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import CONFIG from '../config'
import TagsMerge from '../components/TagsMerge.vue'
import VideoTab from '../components/tab/VideoTab.vue'
import PhotoTab from '../components/tab/PhotoTab.vue'
import AppInput from '../components/atoms/AppInput.vue'
import AppIcon from '../components/atoms/AppIcon.vue'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { addTab } = storeToRefs(app)
const { headlineToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)
const canAddPhoto = computed(() => !!user.value?.isAuthorized && !!user.value?.nick)
</script>
