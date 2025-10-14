<template>
  <q-page class="admin">
    <q-tab-panels v-model="adminTab">
      <q-tab-panel name="repair">
        <div class="text-h6">Rebuild / Repair</div>

        <SendMessage />
        <ButtonRow>
          Recreate existing field values for
          {{ Object.keys(values).join(', ') }}
          <template #button>
            <q-btn color="primary" label="rebuild" @click="meta.countersBuild" />
          </template>
        </ButtonRow>
        <ButtonRow>
          Bucket count and size
          <template #button>
            <q-btn color="primary" label="Recalc" @click="app.bucketBuild" />
          </template>
        </ButtonRow>
        <ButtonRow>
          {{ formatDatum('2025-08-21', 'DD.MM.YYYY') }} Fix text array
          <template #button>
            <q-btn color="primary" label="Fix" @click="fix" />
          </template>
        </ButtonRow>
        <ButtonRow>
          Find images without thumbnails
          <template #button>
            <q-btn label="Find" color="primary" @click="missingThumbnails" />
          </template>
        </ButtonRow>
        <ButtonRow>
          Resolve Cloud storage and datastore mismatch
          <template #button>
            <q-btn color="negative" label="Resolve" @click="mismatch" />
          </template>
        </ButtonRow>

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

      <q-tab-panel name="subscribers" class="q-pa-none">
        <Subscribers-Tab />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { formatDatum } from '../helpers'
import { fix, mismatch, missingThumbnails } from '../helpers/remedy'
import SendMessage from 'src/components/Send-Message.vue'
import ButtonRow from '../components/Button-Row.vue'

const TagsTab = defineAsyncComponent(() => import('../components/Tags-Tab.vue'))
// const CameraTab = defineAsyncComponent(() => import('../components/Camera-Tab.vue'))
const SubscribersTab = defineAsyncComponent(() => import('../components/Subscribers-Tab.vue'))

const app = useAppStore()
const meta = useValuesStore()

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
