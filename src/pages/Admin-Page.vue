<template>
  <q-tab-panels v-model="adminTab" class="body">
    <q-tab-panel name="repair" class="q-pa-none">
      <div class="q-pa-md text-h6">Rebuild / Repair</div>

      <q-list separator>
        <q-item clickable>
          <q-item-section>
            <q-item-label>Bucket count and size</q-item-label>
            <q-item-label caption
              >{{ bucket.count }} photographs / {{ formatBytes(bucket.size) }}</q-item-label
            >
          </q-item-section>
          <q-item-section side>
            <q-btn label="Recalc" @click="app.bucketBuild" />
          </q-item-section>
        </q-item>

        <q-item clickable>
          <q-item-section>
            <q-item-label>Recreate existing field values</q-item-label>
            <q-item-label caption>
              <span v-for="(val, key) in values" :key="key">
                {{ key }}: {{ Object.keys(val).length }};
              </span>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn label="rebuild" @click="meta.countersBuild" />
          </q-item-section>
        </q-item>
        <q-item clickable>
          <q-item-section>
            {{ formatDatum('2025-10-24', 'DD.MM.YYYY') }} Merge users and subsribers
          </q-item-section>
          <q-item-section side>
            <q-btn color="primary" :disable="true" label="Fix" />
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
      <Tags-Tab />
    </q-tab-panel>

    <!-- <q-tab-panel name="camera" class="q-pa-none">
        <Camera-Tab />
      </q-tab-panel> -->

    <q-tab-panel name="users" class="q-pa-none">
      <Users-Tab />
    </q-tab-panel>
    <q-tab-panel name="messages" class="q-pa-none">
      <Messages-Tab />
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import { formatDatum } from 'src/helpers'
import { formatBytes } from 'src/helpers'
import { mismatch, missingThumbnails } from 'src/helpers/remedy'

const TagsTab = defineAsyncComponent(() => import('src/components/tab/Tags-Tab.vue'))
// const CameraTab = defineAsyncComponent(() => import('src/components/tab/Camera-Tab.vue'))
const UsersTab = defineAsyncComponent(() => import('src/components/tab/Users-Tab.vue'))
const MessagesTab = defineAsyncComponent(() => import('src/components/tab/Messages-Tab.vue'))

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
//       actions: [{ icon: 'close' }],
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
