<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <div class="text-h6 q-pa-md">Users</div>

  <q-list separator dense>
    <q-item v-for="item in result" :key="item.uid" clickable>
      <q-item-section>
        <q-item-label>
          <q-input
            v-model="item.nick"
            :readonly="nickValues.includes(item.nick)"
            :rules="[
              (v) => !!v || 'Nick cannot be empty',
              (v) => !nickValues.includes(v) || 'Nick already taken',
            ]"
            :label="`Use nickname for ${item.email}`"
          >
            <template v-if="!nickValues.includes(item.nick)" v-slot:after>
              <q-btn round dense flat icon="edit" @click="auth.changeNick(item)" />
            </template>
          </q-input>
        </q-item-label>
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
      <q-item-section side v-if="$q.screen.gt.xs">
        <div class="row no-wrap">
          <q-checkbox
            name="`admin-${item.key}`"
            v-model="item.isAdmin"
            :disable="user?.email === item.email"
            color="negative"
            label="Admin"
            @click="auth.toggleAdmin(item)"
          />
          <q-checkbox
            name="`authorized-${item.key}`"
            v-model="item.isAuthorized"
            color="primary"
            label="Editor"
            @click="auth.toggleEdit(item)"
          />
          <q-checkbox
            name="`allow-${item.key}`"
            v-model="item.allowPush"
            color="secondary"
            label="Push"
            @click="auth.toggleAllowPush(item)"
          />
        </div>
      </q-item-section>
      <!-- <q-item-section side>
        <q-btn color="primary" label="Edit" />
        <q-btn color="primary" label="Edit" :disable="nickValues.includes(item.nick)" />
      </q-item-section> -->
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'

import ErrorBanner from './Error-Banner.vue'
import type { UsersAndDevices } from '../helpers/models'
import type { Timestamp } from '@google-cloud/firestore'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()

const { busy, error } = storeToRefs(app)
const { user } = storeToRefs(auth)
const { nickValues } = storeToRefs(meta)
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
</script>
