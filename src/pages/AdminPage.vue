<template>
  <q-tab-panels v-model="adminTab" class="body">
    <q-tab-panel name="repair" class="q-pa-none">
      <q-banner class="q-pa-md">
        <template v-slot:avatar>
          <q-icon name="sym_r_construction" />
        </template>
        <span class="text-h6">Rebuild / Repair</span>
      </q-banner>

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
              <template v-for="(val, key) in values" :key="key">
                <span class="text-body1">{{ key }}</span>
                <q-badge class="q-mx-xs bg-secondary text-black text-body2">
                  {{ Object.keys(val).length }}
                </q-badge>
              </template>
            </q-item-label>
            <q-item-label caption> Automatic cron job every 3 days </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn label="rebuild" @click="countersBuild" flat />
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
