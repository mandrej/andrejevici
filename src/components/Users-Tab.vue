<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <div class="text-h6 q-pa-md">Users</div>

  <q-list separator>
    <q-item v-for="item in result" :key="item.uid" clickable>
      <q-item-section>
        <q-item-label>{{ item.email }} alias {{ item.nick }}</q-item-label>
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
          name="`admin-${item.key}`"
          v-model="item.isAdmin"
          color="negative"
          label="Admin"
        />
      </q-item-section>
      <q-item-section side>
        <q-checkbox
          name="`authorized-${item.key}`"
          v-model="item.isAuthorized"
          color="primary"
          label="Authorized"
        />
      </q-item-section>
      <q-item-section side>
        <q-checkbox
          name="`allow-${item.key}`"
          v-model="item.allowPush"
          color="secondary"
          label="Allow Push"
        />
      </q-item-section>
      <q-item-section side>
        <q-btn color="primary" label="Edit" />
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'

import ErrorBanner from './Error-Banner.vue'
import type { UsersAndDevices } from '../helpers/models'
import type { Timestamp } from '@google-cloud/firestore'

const app = useAppStore()
const auth = useUserStore()

const { busy, error } = storeToRefs(app)
const result = ref<UsersAndDevices[]>([])

const fetchList = async () => {
  busy.value = true
  error.value = ''
  const subscribersAndDevices = await auth.fetchUsersAndDevices()
  result.value = subscribersAndDevices ?? []
  busy.value = false
  error.value = result.value.length === 0 ? 'No subscribers found' : ''
}

onMounted(fetchList)

// const remove = async (subscriber: UsersAndDevices) => {
//   await auth.removeSubscriber(subscriber)
//   result.value = result.value.filter((item) => item.key !== subscriber.key)
// }

const ageDays = (timestamp: Timestamp) => {
  const diff = Date.now() - timestamp.toMillis()
  return Math.floor(diff / 86400000)
}
const countTokens = (timestamps: { toMillis: () => number }[]) => {
  return timestamps.length > 0 ? `${timestamps.length} tokens:` : 'No tokens'
}
// const toggle = async (subscriber: UsersAndDevices) => {
//   await auth.toggleAllowPush(subscriber)
// }
</script>
