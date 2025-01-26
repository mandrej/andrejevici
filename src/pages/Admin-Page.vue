<template>
  <q-page class="admin q-pt-md">
    <q-tab-panels v-model="adminTab">
      <q-tab-panel name="repair" class="q-pa-none">
        <q-list>
          <q-item class="text-h6">Rebuild / Repair</q-item>
          <q-item>
            <q-item-section>
              <q-input v-model="message" label="Send message to subscribers" />
            </q-item-section>
            <q-item-section side>
              <q-btn :disabled="!token" color="secondary" label="Send" @click="send" />
            </q-item-section>
          </q-item>
        </q-list>
        <q-list separator>
          <q-item>
            <q-item-section>
              Recreate existing field values for
              {{ Object.keys(values).join(', ') }}
            </q-item-section>
            <q-item-section side>
              <q-btn color="primary" label="rebuild" @click="meta.countersBuild" />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section> Bucket count and size </q-item-section>
            <q-item-section side>
              <q-btn color="primary" label="Recalc" @click="app.bucketBuild" />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              {{ formatDatum('2024-10-27', 'DD.MM.YYYY') }} Fix text array
            </q-item-section>
            <q-item-section side>
              <q-btn :disabled="!token" color="primary" label="Fix" @click="fix" />
            </q-item-section>
          </q-item>
          <q-item>
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

      <q-tab-panel name="camera" class="q-pa-none">
        <Camera-Tab />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { computed, ref, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { fix, mismatch } from '../helpers/remedy'
import notify from '../helpers/notify'
import { CONFIG, formatDatum } from '../helpers'

const TagsTab = defineAsyncComponent(() => import('../components/Tags-Tab.vue'))
const CameraTab = defineAsyncComponent(() => import('../components/Camera-Tab.vue'))

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()

const message = ref('TEST')
const { adminTab } = storeToRefs(app)
const { token } = storeToRefs(auth)
const values = computed(() => meta.values)

const send = () => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
  fetch(CONFIG.notifyUrl, {
    method: 'POST',
    mode: 'cors',
    headers: headers,
    body: JSON.stringify({ text: message.value.trim() }),
  })
    .then((response) => {
      if (!response.ok) {
        throw response
      }
      return response.text()
    })
    .then((text) => {
      notify({ message: `Message ${text} sent` })
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
