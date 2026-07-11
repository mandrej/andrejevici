<template>
  <!-- Tab panels driven by adminTab store -->
  <div class="min-h-full">
    <!-- Repair panel -->
    <template v-if="adminTab === 'repair'">
      <div
        class="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      >
        <AppIcon name="construction" class="w-6 h-6 text-primary" />
        <span class="text-lg font-semibold text-gray-900 dark:text-white">Rebuild / Repair</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <!-- Bucket Card -->
        <AdminCard
          icon="storage"
          color="primary"
          title="Bucket Status"
          description="Current total storage usage and file count. Updated via cron job every 3 days."
        >
          <template #details>
            <div class="text-center py-2">
              <AppBadge color="warning" textColor="black" class="text-base px-4 py-2">
                {{ Intl.NumberFormat().format(bucket.count) }} photos &nbsp;/&nbsp;
                {{ formatBytes(bucket.size) }}
              </AppBadge>
            </div>
          </template>
          <template #action>
            <AppButton flat label="Calculate" @click="bucketStore.bucketBuild" color="primary" />
          </template>
        </AdminCard>

        <!-- Field Values Card -->
        <AdminCard
          icon="schema"
          color="secondary"
          title="Metadata Counters"
          description="Rebuild index counters for all metadata fields. Updated via cron job every 3 days."
        >
          <template #details>
            <div class="flex flex-wrap gap-1">
              <AppBadge
                v-for="(val, key) in values"
                :key="key"
                color="secondary"
                textColor="black"
                class="text-base px-4 py-2"
              >
                {{ key }}: {{ Object.keys(val).length }}
              </AppBadge>
            </div>
          </template>
          <template #action>
            <AppButton flat label="Build" @click="countersBuild" color="secondary" />
          </template>
        </AdminCard>

        <!-- Dimensions Card -->
        <AdminCard
          icon="aspect_ratio"
          color="accent"
          title="Add photo kind"
          description="Populates kind 'photo' where missing in Photo collection."
        >
          <template #details>
            <div class="text-center mt-2">
              <AppBadge color="accent" class="text-base px-4 py-2">
                Last run: {{ formatDatum('2026-05-05', 'DD.MM.YYYY') }}
              </AppBadge>
            </div>
          </template>
          <template #action>
            <AppButton flat color="accent" label="Run Fix" @click="fix" />
          </template>
        </AdminCard>

        <!-- Thumbnails Card -->
        <AdminCard
          icon="image_not_supported"
          color="warning"
          title="Missing Thumbs"
          description="Scan storage for images that are missing generated thumbnails."
        >
          <template #action>
            <AppButton flat label="Scan" color="warning" @click="missingThumbnails" />
          </template>
        </AdminCard>

        <!-- Mismatch Card -->
        <AdminCard
          icon="sync_problem"
          color="negative"
          title="Storage Mismatch"
          description="Resolve inconsistencies between Cloud Storage and Firestore."
        >
          <template #action>
            <AppButton flat color="negative" label="Resolve" @click="mismatch" />
          </template>
        </AdminCard>
      </div>
    </template>

    <!-- Meta panel -->
    <template v-else-if="adminTab === 'meta'">
      <MetaTab />
    </template>

    <!-- Users panel -->
    <template v-else-if="adminTab === 'users'">
      <UsersTab />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useBucketStore } from '../stores/bucket'
import { formatDatum, formatBytes } from '../helpers'
import AdminCard from '../components/AdminCard.vue'
import AppBadge from '../components/atoms/AppBadge.vue'
import AppButton from '../components/atoms/AppButton.vue'
import AppIcon from '../components/atoms/AppIcon.vue'
import { mismatch, missingThumbnails, fix } from '../helpers/remedy'
import CONFIG from '../config'

const MetaTab = defineAsyncComponent(() => import('../components/tab/MetaTab.vue'))
const UsersTab = defineAsyncComponent(() => import('../components/tab/UsersTab.vue'))

const app = useAppStore()
const meta = useValuesStore()
const bucketStore = useBucketStore()
const { bucket } = storeToRefs(bucketStore)
const { adminTab } = storeToRefs(app)
const values = computed(() => meta.values)

/**
 * Rebuilds Firestore counter documents for every field defined in CONFIG.photo_filter sequentially.
 */
const countersBuild = async () => {
  for (const field of CONFIG.photo_filter) {
    await meta.countersBuild(field)
  }
}
</script>
