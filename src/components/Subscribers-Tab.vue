<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <div class="text-h6 q-pa-md">Subscribers</div>
  <ButtonRow class="q-px-md">
    <q-input v-model="message" label="Send message to subscribers" />
    <template #button>
      <q-btn :disabled="!token" color="secondary" label="Send" @click="send" />
    </template>
  </ButtonRow>

  <q-list separator>
    <q-item v-for="item in result" :key="item.key" clickable>
      <q-item-section>
        <q-item-label>{{ item.email }}</q-item-label>
        <q-item-label>subscribed {{ ageDays(item.timestamp) }} days ago</q-item-label>
        <q-item-label caption>
          {{ countTokens(item.timestamps) }}
          <template v-for="(timestamp, index) in item.timestamps" :key="index">
            {{ ageDays(timestamp) }}
            <span v-if="index < item.timestamps.length - 1">, </span>
            <span v-else> days old </span>
          </template>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-checkbox
          name="`allow-${item.key}`"
          v-model="item.allowPush"
          label="Allow Push"
          @click="toggle(item)"
        />
      </q-item-section>
      <q-item-section side>
        <q-btn icon="delete" @click="remove(item)" color="primary" flat />
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { CONFIG } from '../helpers'
import notify from '../helpers/notify'
import ButtonRow from './Button-Row.vue'
import ErrorBanner from './Error-Banner.vue'
import type { SubscriberAndDevices } from '../helpers/models'
import type { Timestamp } from '@google-cloud/firestore'

const app = useAppStore()
const auth = useUserStore()
const message = ref('TEST')
const { token } = storeToRefs(auth)
const { busy, error } = storeToRefs(app)
const result = ref<SubscriberAndDevices[]>([])

const fetchList = async () => {
  busy.value = true
  error.value = ''
  const subscribersAndDevices = await auth.fetchSubscribersAndDevices()
  result.value = subscribersAndDevices ?? []
  busy.value = false
  error.value = result.value.length === 0 ? 'No subscribers found' : ''
}

onMounted(fetchList)

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

const remove = async (subscriber: SubscriberAndDevices) => {
  await auth.removeSubscriber(subscriber)
  result.value = result.value.filter((item) => item.key !== subscriber.key)
}

const ageDays = (timestamp: Timestamp) => {
  const diff = Date.now() - timestamp.toMillis()
  return Math.floor(diff / 86400000)
}
const countTokens = (timestamps: { toMillis: () => number }[]) => {
  return timestamps.length > 0 ? `${timestamps.length} tokens:` : 'No tokens'
}
const toggle = async (subscriber: SubscriberAndDevices) => {
  await auth.toggleAllowPush(subscriber)
}
</script>
