<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <div class="text-h6 q-pa-md">Users</div>

  <q-list separator dense>
    <q-item v-for="item in result" :key="item.uid" clickable>
      <q-item-section avatar>
        <q-badge class="text-body1" color="warning" text-color="black">{{
          contribution(item.nick)
        }}</q-badge>
      </q-item-section>
      <q-item-section>
        <q-item-label>
          <q-input
            class="text-h6"
            v-model="item.nick"
            :readonly="nickValues.includes(item.nick)"
            :rules="[
              (v) => !!v || 'Nick cannot be empty',
              (v) => !nickValues.includes(v) || 'Nick already taken',
            ]"
            :label="`Use nickname for ${item.email}`"
          >
            <template v-if="!nickValues.includes(item.nick)" v-slot:after>
              <q-btn round dense flat icon="edit" @click="auth.updateUser(item, 'nick')" />
            </template>
          </q-input>
        </q-item-label>
        <q-item-label>subscribed {{ ageDays(item.timestamp) }} days ago</q-item-label>
      </q-item-section>
      <q-item-section side v-if="$q.screen.gt.xs">
        <q-item-label>
          <q-badge color="secondary" text-color="black">
            {{ countTokens(item.timestamps) }}
          </q-badge>
          <template v-for="(timestamp, index) in item.timestamps" :key="index">
            <q-badge
              v-if="index < item.timestamps.length"
              color="secondary"
              class="q-ml-xs"
              text-color="black"
            >
              {{ ageDays(timestamp) }}
            </q-badge>
            <span v-else> days old </span>
          </template>
        </q-item-label>
      </q-item-section>
      <q-item-section side v-if="$q.screen.gt.xs">
        <div class="row no-wrap">
          <q-checkbox
            v-model="item.isAdmin"
            :disable="user?.email === item.email"
            color="negative"
            label="Admin"
            @click="user?.email !== item.email ? auth.updateUser(item, 'isAdmin') : null"
          />
          <q-checkbox
            v-model="item.isAuthorized"
            color="primary"
            label="Editor"
            @click="auth.updateUser(item, 'isAuthorized')"
          />
          <q-checkbox
            v-model="item.allowPush"
            color="secondary"
            label="Push"
            @click="auth.updateUser(item, 'allowPush')"
          />
        </div>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import { useUserStore } from 'src/stores/user'

import ErrorBanner from 'src/components/Error-Banner.vue'
import type { UsersAndDevices } from 'src/helpers/models'
import type { Timestamp } from '@google-cloud/firestore'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()

const { busy, error } = storeToRefs(app)
const { user } = storeToRefs(auth)
const { nickValues, nickWithCount } = storeToRefs(meta)
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

const ageDays = (timestamp: Timestamp) => {
  const diff = Date.now() - timestamp.toMillis()
  return Math.floor(diff / 86400000)
}
const countTokens = (timestamps: { toMillis: () => number }[]) => {
  return timestamps.length > 0 ? `${timestamps.length} tokens` : 'No tokens'
}
const contribution = (nick: string) => {
  const entry = nickWithCount.value[nick]
  return entry ? entry : 0
}
</script>
