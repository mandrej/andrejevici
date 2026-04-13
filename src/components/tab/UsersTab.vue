<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <PageTitle title="Users" icon="sym_r_person" />

  <div class="q-px-md q-pb-md">
    <LocalSearch v-model="search" label="Search users" :options="nickValues" />
  </div>

  <q-scroll-area class="q-pa-md" style="height: 65vh">
    <q-list separator :dense="$q.screen.xs">
      <q-item v-for="item in filteredResult" :key="item.uid">
        <q-item-section avatar>
          <q-badge class="text-body1" color="warning" text-color="black">
            {{ contribution(item.nick) }}
          </q-badge>
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-h6 row items-center">
            {{ item.nick || '???' }}
            <q-btn
              v-if="contribution(item.nick) === 0"
              flat
              round
              dense
              icon="sym_r_edit"
              color="primary"
              class="q-ml-sm"
              @click="openNickDialog(item)"
            >
              <q-tooltip>Change nickname</q-tooltip>
            </q-btn>
            <q-btn
              v-if="contribution(item.nick) === 0"
              flat
              round
              dense
              icon="sym_r_delete"
              color="negative"
              class="q-ml-xs"
              @click="confirmDeleteUser(item)"
            >
              <q-tooltip>Delete user</q-tooltip>
            </q-btn>
          </q-item-label>
          <q-item-label caption>{{ item.email }}</q-item-label>
          <q-item-label caption>subscribed {{ ageDays(item.timestamp) }} days ago</q-item-label>
        </q-item-section>

        <q-item-section side v-if="$q.screen.gt.xs">
          <q-item-label>
            <template v-if="item.timestamps?.length">
              <q-badge
                v-for="(timestamp, index) in item.timestamps"
                :key="index"
                color="secondary"
                text-color="black"
                class="q-ml-xs"
              >
                {{ ageDays(timestamp) }}
              </q-badge>
            </template>
            <q-badge v-else color="grey-3" text-color="grey-7">no tokens</q-badge>
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <div class="column">
            <q-checkbox
              dense
              v-model="item.isAdmin"
              :disable="user?.email === item.email || !item.nick"
              color="negative"
              label="Admin"
              @click="
                user?.email !== item.email && item.nick ? auth.updateUser(item, 'isAdmin') : null
              "
            />
            <q-checkbox
              dense
              v-model="item.isAuthorized"
              :disable="!item.nick"
              color="primary"
              label="Editor"
              @click="item.nick ? auth.updateUser(item, 'isAuthorized') : null"
            />
            <q-checkbox
              dense
              v-model="item.allowPush"
              :disable="!item.nick"
              color="secondary"
              label="Push"
              @click="item.nick ? auth.updateUser(item, 'allowPush') : null"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-scroll-area>

  <!-- Delete User Confirmation Dialog -->
  <q-dialog v-model="showDeleteDialog" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Delete user?</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        Remove <strong>{{ userToDelete?.nick }}</strong> ({{ userToDelete?.email }})? This cannot be
        undone.
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn flat label="Delete" color="negative" @click="doDeleteUser" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Nickname Edit Dialog -->
  <q-dialog v-model="showNickDialog" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Change nickname for {{ userToEdit?.email }}</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="tempNick"
          label="New nickname"
          autofocus
          clearable
          :rules="[
            (v) => !!v || 'Nickname cannot be empty',
            (v) => !nickValues.includes(v) || 'Nickname already taken',
          ]"
          @keyup.enter="saveNick"
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          flat
          label="Save"
          @click="saveNick"
          :disable="!tempNick || nickValues.includes(tempNick)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useValuesStore } from '../../stores/values'
import { useUserStore } from '../../stores/user'

import ErrorBanner from '../ErrorBanner.vue'
import type { UsersAndDevices } from '../../helpers/models'
import type { Timestamp } from '@google-cloud/firestore'
import PageTitle from '../PageTitle.vue'
import LocalSearch from '../LocalSearch.vue'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()

const { busy, error } = storeToRefs(app)
const { user } = storeToRefs(auth)
const { nickValues, nickWithCount } = storeToRefs(meta)
const result = ref<UsersAndDevices[]>([])
const search = ref('')

const filteredResult = computed(() => {
  if (!search.value) return result.value
  const query = search.value.toLowerCase()
  return result.value.filter(
    (item) => item.nick.toLowerCase().includes(query) || item.email.toLowerCase().includes(query),
  )
})

const showNickDialog = ref(false)
const userToEdit = ref<UsersAndDevices | null>(null)
const tempNick = ref('')

const showDeleteDialog = ref(false)
const userToDelete = ref<UsersAndDevices | null>(null)

const confirmDeleteUser = (user: UsersAndDevices) => {
  userToDelete.value = user
  showDeleteDialog.value = true
}

const doDeleteUser = async () => {
  if (userToDelete.value) {
    await auth.deleteUser(userToDelete.value.uid)
    showDeleteDialog.value = false
    await fetchList()
  }
}

const fetchList = async () => {
  busy.value = true
  error.value = ''
  const subscribersAndDevices = await auth.fetchUsersAndDevices()
  result.value = subscribersAndDevices ?? []
  busy.value = false
  error.value = result.value.length === 0 ? 'No subscribers found' : ''
}

const openNickDialog = (user: UsersAndDevices) => {
  userToEdit.value = user
  tempNick.value = user.nick
  showNickDialog.value = true
}

const saveNick = async () => {
  if (userToEdit.value && tempNick.value) {
    userToEdit.value.nick = tempNick.value
    await auth.updateUser(userToEdit.value, 'nick')
    showNickDialog.value = false
  }
}

onMounted(fetchList)

const ageDays = (timestamp: Timestamp) => {
  const diff = Date.now() - timestamp.toMillis()
  return Math.floor(diff / 86400000)
}
const contribution = (nick: string) => {
  const entry = nickWithCount.value[nick]
  return entry ? entry : 0
}
</script>
