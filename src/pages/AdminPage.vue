<template>
  <q-tab-panels v-model="adminTab" class="body">
    <q-tab-panel name="repair" class="q-pa-none">
      <q-banner class="q-pa-md">
        <template v-slot:avatar>
          <q-icon name="sym_r_construction" />
        </template>
        <span class="text-h6">Rebuild / Repair</span>
      </q-banner>

      <div class="row q-col-gutter-md q-pa-md">
        <!-- Bucket Card -->
        <div class="col-12 col-sm-6 col-md-4">
          <AdminCard
            icon="sym_r_storage"
            color="primary"
            title="Bucket Status"
            description="Current total storage usage and file count. Updated via cron job every 3 days."
          >
            <template #details>
              <div class="text-center q-py-sm">
                <q-badge color="warning" class="text-h6 text-black q-pa-md rounded-borders">
                  <span>{{ Intl.NumberFormat().format(bucket.count) }} photos</span>
                  <span class="q-mx-xs">/</span>
                  <span>{{ formatBytes(bucket.size) }}</span>
                </q-badge>
              </div>
            </template>
            <template #action>
              <q-btn label="Calculate" @click="bucketStore.bucketBuild" color="primary" flat />
            </template>
          </AdminCard>
        </div>

        <!-- Field Values Card -->
        <div class="col-12 col-sm-6 col-md-4">
          <AdminCard
            icon="sym_r_schema"
            color="secondary"
            title="Metadata Counters"
            description="Rebuild index counters for all metadata fields. Updated via cron job every 3 days."
          >
            <template #details>
              <div class="row q-gutter-xs">
                <q-badge
                  v-for="(val, key) in values"
                  :key="key"
                  color="secondary"
                  class="text-subtitle1 text-black"
                >
                  {{ key }}: {{ Object.keys(val).length }}
                </q-badge>
              </div>
            </template>
            <template #action>
              <q-btn label="Build" @click="countersBuild" color="secondary" flat />
            </template>
          </AdminCard>
        </div>

        <!-- Dimensions Card -->
        <div class="col-12 col-sm-6 col-md-4">
          <AdminCard
            icon="sym_r_aspect_ratio"
            color="accent"
            title="Add photo kind"
            description="Populates kind 'photo' where missing in Photo collection."
          >
            <template #details>
              <div class="q-mt-sm">
                <q-badge color="accent" icon="event" class="text-subtitle1">
                  Last run: {{ formatDatum('2026-05-05', 'DD.MM.YYYY') }}
                </q-badge>
              </div>
            </template>
            <template #action>
              <q-btn color="accent" label="Run Fix" @click="fix" flat />
            </template>
          </AdminCard>
        </div>

        <!-- Thumbnails Card -->
        <div class="col-12 col-sm-6 col-md-4">
          <AdminCard
            icon="sym_r_image_not_supported"
            color="orange"
            title="Missing Thumbs"
            description="Scan storage for images that are missing generated thumbnails."
          >
            <template #action>
              <q-btn label="Scan" color="orange" @click="missingThumbnails" flat />
            </template>
          </AdminCard>
        </div>

        <!-- Mismatch Card -->
        <div class="col-12 col-sm-6 col-md-4">
          <AdminCard
            icon="sym_r_sync_problem"
            color="negative"
            title="Storage Mismatch"
            description="Resolve inconsistencies between Cloud Storage and Firestore."
          >
            <template #action>
              <q-btn color="negative" label="Resolve" @click="mismatch" flat />
            </template>
          </AdminCard>
        </div>
      </div>

      <!-- <div class="q-pa-md row q-gutter-sm items-center">
        <div class="text-subtitle2 text-grey-7 q-mr-md">Debug Notifications:</div>
        <q-btn flat round dense color="primary" icon="sym_r_info" @click="show" />
        <q-btn flat round dense color="secondary" icon="sym_r_warning" @click="show" />
        <q-btn flat round dense color="accent" icon="sym_r_stars" @click="show" />
        <q-btn flat round dense color="positive" icon="sym_r_check_circle" @click="show" />
        <q-btn flat round dense color="negative" icon="sym_r_error" @click="show" />
        <q-btn flat round dense color="dark" icon="sym_r_visibility" @click="show" />
      </div> -->
    </q-tab-panel>

    <q-tab-panel name="meta" class="q-pa-none">
      <MetaTab />
    </q-tab-panel>

    <q-tab-panel name="users" class="q-pa-none">
      <UsersTab />
    </q-tab-panel>
    <q-tab-panel name="messages" class="q-pa-none">
      <MessagesTab />
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useBucketStore } from '../stores/bucket'
import { formatDatum } from '../helpers'
import { formatBytes } from '../helpers'
import AdminCard from '../components/AdminCard.vue'
import { mismatch, missingThumbnails, fix } from '../helpers/remedy'
import CONFIG from 'src/config'
// import notify from 'src/helpers/notify'

const MetaTab = defineAsyncComponent(() => import('../components/tab/MetaTab.vue'))
const UsersTab = defineAsyncComponent(() => import('../components/tab/UsersTab.vue'))
const MessagesTab = defineAsyncComponent(() => import('../components/tab/MessagesTab.vue'))

const app = useAppStore()
const meta = useValuesStore()
const bucketStore = useBucketStore()
const { bucket } = storeToRefs(bucketStore)

const { adminTab } = storeToRefs(app)
const values = computed(() => meta.values)

const countersBuild = async () => {
  for (const field of CONFIG.photo_filter) {
    await meta.countersBuild(field)
  }
}

// const show = () => {
//   const colors = ['info', 'warning', 'positive', 'negative', 'ongoing', 'external'] as const
//   for (const color of colors) {
//     notify({
//       type: color,
//       html: true,
//       message: `${color}<br>Testing notification system`,
//       actions: [{ icon: 'sym_r_close' }],
//       caption: 'System Test',
//     })
//   }
// }
</script>

<style scoped></style>
