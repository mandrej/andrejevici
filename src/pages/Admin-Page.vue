<template>
  <q-page class="admin">
    <q-tab-panels v-model="adminTab">
      <q-tab-panel name="repair">
        <div class="text-h6">Rebuild / Repair</div>
        <ButtonRow>
          <q-input v-model="message" label="Send message to subscribers" />
          <template #button>
            <q-btn :disabled="!token" color="secondary" label="Send" @click="send" />
          </template>
        </ButtonRow>
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
            <q-btn :disabled="!token" color="primary" label="Fix" @click="fix" />
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
import { computed, ref, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { fix, mismatch, missingThumbnails } from '../helpers/remedy'
import notify from '../helpers/notify'
import { CONFIG, formatDatum } from '../helpers'
import ButtonRow from '../components/Button-Row.vue'

const TagsTab = defineAsyncComponent(() => import('../components/Tags-Tab.vue'))
// const CameraTab = defineAsyncComponent(() => import('../components/Camera-Tab.vue'))
const SubscribersTab = defineAsyncComponent(() => import('../components/Subscribers-Tab.vue'))

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()

const message = ref('TEST')
const { adminTab } = storeToRefs(app)
const { token } = storeToRefs(auth)
const values = computed(() => meta.values)

const send = () => {
  const msg = message.value.trim()
  if (msg === '') notify({ type: 'warning', message: 'No message provided' })
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
  fetch(CONFIG.notifyUrl, {
    method: 'POST',
    mode: 'cors',
    headers: headers,
    body: JSON.stringify({ text: msg }),
  })
    .then((response) => {
      if (!response.ok) {
        throw response
      }
      return response.text()
    })
    .then((text) => {
      notify({ message: `${text}` })
      return text
    })
    .catch((error) => {
      notify({ type: 'negative', message: `${error}` })
    })
}

// const show = () => {
//   const colors = ['info', 'warning', 'positive', 'negative', 'ongoing', 'external']
//   for (const color of colors) {
//     notify({
//       type: color,
//       html: true,
//       message: `${color}<br>${message.value}`,
//       actions: [{ icon: 'close' }],
//       caption: 'testing',
//     })
//   }
// }
</script>
