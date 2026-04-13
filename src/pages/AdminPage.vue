<template>
  <q-tab-panels v-model="adminTab" class="body">
    <q-tab-panel name="repair" class="q-pa-none">
      <PageTitle title="Rebuild / Repair" icon="sym_r_construction" />

      <q-list separator>
        <q-item clickable>
          <q-item-section avatar>
            <q-badge transparent align="middle" color="warning" class="text-h6 text-black">
              {{ Intl.NumberFormat().format(bucket.count) }}/{{ formatBytes(bucket.size) }}</q-badge
            >
          </q-item-section>
          <q-item-section>
            <q-item-label>Bucket count and size</q-item-label>
            <q-item-label caption> Automatic cron job every 3 days </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn label="Recalc" @click="app.bucketBuild" flat />
          </q-item-section>
        </q-item>

        <q-item clickable>
          <q-item-section>
            <q-item-label>Recreate existing field values</q-item-label>
            <q-item-label caption>
              <span v-for="(val, key) in values" :key="key" class="text-h6">
                {{ key }}
                <q-badge transparent align="middle" color="secondary" text-color="black">
                  {{ Object.keys(val).length }}</q-badge
                >,
              </span>
            </q-item-label>
            <q-item-label caption> Automatic cron job every 3 days </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn label="rebuild" @click="meta.countersBuild" flat />
          </q-item-section>
        </q-item>

        <q-item clickable>
          <q-item-section>
            <q-item-label
              >Fixes photos in the database by populating missing dimensions.</q-item-label
            >
            <q-item-label caption class="text-h6">{{
              formatDatum('2026-02-27', 'DD.MM.YYYY')
            }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn color="primary" :disable="true" label="Fix" @click="fix" />
          </q-item-section>
        </q-item>
        <q-item clickable>
          <q-item-section> Find images without thumbnails </q-item-section>
          <q-item-section side>
            <q-btn label="Find" color="primary" @click="missingThumbnails" />
          </q-item-section>
        </q-item>
        <q-item clickable>
          <q-item-section> Resolve Cloud storage and datastore mismatch </q-item-section>
          <q-item-section side>
            <q-btn color="negative" label="Resolve" @click="mismatch" />
          </q-item-section>
        </q-item>
      </q-list>

      <!-- <div class="q-pa-md">
          <q-btn color="primary" label="Show" @click="show" />
          <q-btn color="secondary" label="Show" @click="show" />
          <q-btn color="accent" label="Show" @click="show" />
          <q-btn color="positive" label="Show" @click="show" />
          <q-btn color="negative" label="Show" @click="show" />
          <q-btn color="dark" label="Show" @click="show" />
        </div> -->
    </q-tab-panel>

    <q-tab-panel name="tags" class="q-pa-none">
      <TagsTab />
    </q-tab-panel>

    <!-- <q-tab-panel name="camera" class="q-pa-none">
        <CameraTab />
      </q-tab-panel> -->

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
import PageTitle from '../components/PageTitle.vue'

const TagsTab = defineAsyncComponent(() => import('../components/tab/TagsTab.vue'))
// const CameraTab = defineAsyncComponent(() => import('../components/tab/CameraTab.vue'))
const UsersTab = defineAsyncComponent(() => import('../components/tab/UsersTab.vue'))
const MessagesTab = defineAsyncComponent(() => import('../components/tab/MessagesTab.vue'))

const app = useAppStore()
const meta = useValuesStore()
const { bucket } = storeToRefs(app)

const { adminTab } = storeToRefs(app)
const values = computed(() => meta.values)

// const show = () => {
//   const colors = ['info', 'warning', 'positive', 'negative', 'ongoing', 'external']
//   for (const color of colors) {
//     notify({
//       type: color,
//       html: true,
//       message: `${color}<br>Testing`,
//       actions: [{ icon: 'sym_r_close' }],
//       caption: 'testing',
//     })
//   }
// }
</script>

<style scoped>
.q-btn--standard {
  width: 100px;
}
</style>
