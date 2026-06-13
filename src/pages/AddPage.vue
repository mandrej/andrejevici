<template>
  <q-banner class="q-pa-md">
    <template v-slot:avatar>
      <q-icon :name="addTab === 'photo' ? 'sym_r_upload' : 'sym_r_video_library'" />
    </template>
    <span class="text-h6">{{
      addTab === 'photo' ? 'Upload / publish images' : 'Link videos'
    }}</span>
  </q-banner>

  <template v-if="canAddPhoto">
    <q-tab-panels v-model="addTab" animated>
      <q-tab-panel name="photo">
        <PhotoTab />
      </q-tab-panel>

      <q-tab-panel name="video">
        <VideoTab />
      </q-tab-panel>
    </q-tab-panels>

    <div class="q-px-md q-pb-md" style="background-color: var(--q-my-toolbar-bg)">
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-input
            v-model="headlineToApply"
            label="Headline to apply"
            :hint="`If no headline supplied, '${CONFIG.noTitle}' apply`"
            clearable
          />
        </div>
        <div class="col-12 col-sm-6">
          <TagsMerge :label="`Tags to apply`" :hint="`You can add / remove tag later`" />
        </div>
      </div>
    </div>
  </template>
  <div v-else class="q-pa-md text-center">
    <q-banner class="bg-warning text-white rounded-borders">
      <template #avatar>
        <q-icon name="sym_r_warning" size="md" />
      </template>
      Only authorized users with a defined nickname can upload photos.
    </q-banner>
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

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { addTab } = storeToRefs(app)
const { headlineToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)
const canAddPhoto = computed(() => !!user.value?.isAuthorized && !!user.value?.nick)
</script>
