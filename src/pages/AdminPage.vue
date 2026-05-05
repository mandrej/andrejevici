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
          <q-card flat bordered class="full-height column">
            <q-card-section class="col">
              <div class="row items-center no-wrap q-mb-sm">
                <q-icon name="sym_r_storage" size="sm" color="primary" class="q-mr-sm" />
                <div class="text-subtitle1 text-weight-bold">Bucket Status</div>
              </div>
              <div class="text-caption text-grey-7 q-mb-md">
                Current total storage usage and file count. Updated via cron.
              </div>
              <div class="text-center q-py-sm">
                <q-badge color="warning" class="text-h6 text-black q-pa-md rounded-borders">
                  <span>{{ Intl.NumberFormat().format(bucket.count) }} photos</span>
                  <span class="q-mx-xs">/</span>
                  <span>{{ formatBytes(bucket.size) }}</span>
                </q-badge>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn label="Recalculate" @click="app.bucketBuild" color="primary" flat />
            </q-card-actions>
          </q-card>
        </div>

        <!-- Field Values Card -->
        <div class="col-12 col-sm-6 col-md-4">
          <q-card flat bordered class="full-height column">
            <q-card-section class="col">
              <div class="row items-center no-wrap q-mb-sm">
                <q-icon name="sym_r_schema" size="sm" color="secondary" class="q-mr-sm" />
                <div class="text-subtitle1 text-weight-bold">Metadata Counters</div>
              </div>
              <div class="text-caption text-grey-7 q-mb-sm">
                Rebuild index counters for all metadata fields.
              </div>
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
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn label="Rebuild" @click="countersBuild" color="secondary" flat />
            </q-card-actions>
          </q-card>
        </div>

        <!-- Dimensions Card -->
        <div class="col-12 col-sm-6 col-md-4">
          <q-card flat bordered class="full-height column">
            <q-card-section class="col">
              <div class="row items-center no-wrap q-mb-sm">
                <q-icon name="sym_r_aspect_ratio" size="sm" color="accent" class="q-mr-sm" />
                <div class="text-subtitle1 text-weight-bold">Photo kind</div>
              </div>
              <div class="text-caption text-grey-7">
                Populates kind 'photo' where missing in Photo collection.
              </div>
              <div class="q-mt-sm">
                <q-badge color="accent" icon="event" class="text-subtitle1">
                  Last run: {{ formatDatum('2026-05-05', 'DD.MM.YYYY') }}
                </q-badge>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn color="accent" label="Run Fix" @click="fix" flat />
            </q-card-actions>
          </q-card>
        </div>

        <!-- Thumbnails Card -->
        <div class="col-12 col-sm-6 col-md-4">
          <q-card flat bordered class="full-height column">
            <q-card-section class="col">
              <div class="row items-center no-wrap q-mb-sm">
                <q-icon name="sym_r_image_not_supported" size="sm" color="orange" class="q-mr-sm" />
                <div class="text-subtitle1 text-weight-bold">Missing Thumbs</div>
              </div>
              <div class="text-caption text-grey-7">
                Scan storage for images that are missing generated thumbnails.
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn label="Scan" color="orange" @click="missingThumbnails" flat />
            </q-card-actions>
          </q-card>
        </div>

        <!-- Mismatch Card -->
        <div class="col-12 col-sm-6 col-md-4">
          <q-card flat bordered class="full-height column">
            <q-card-section class="col">
              <div class="row items-center no-wrap q-mb-sm">
                <q-icon name="sym_r_sync_problem" size="sm" color="negative" class="q-mr-sm" />
                <div class="text-subtitle1 text-weight-bold">Storage Mismatch</div>
              </div>
              <div class="text-caption text-grey-7">
                Resolve inconsistencies between Cloud Storage and Firestore.
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn color="negative" label="Resolve" @click="mismatch" flat />
            </q-card-actions>
          </q-card>
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
import { formatDatum } from '../helpers'
import { formatBytes } from '../helpers'
import { mismatch, missingThumbnails, fix } from '../helpers/remedy'
import CONFIG from 'src/config'
// import notify from 'src/helpers/notify'

const MetaTab = defineAsyncComponent(() => import('../components/tab/MetaTab.vue'))
const UsersTab = defineAsyncComponent(() => import('../components/tab/UsersTab.vue'))
const MessagesTab = defineAsyncComponent(() => import('../components/tab/MessagesTab.vue'))

const app = useAppStore()
const meta = useValuesStore()
const { bucket } = storeToRefs(app)

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
