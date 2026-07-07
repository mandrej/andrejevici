<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <!-- Header banner -->
  <div
    class="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
  >
    <AppIcon name="sym_r_person" class="w-6 h-6 text-primary" />
    <span class="text-lg font-semibold text-gray-900 dark:text-white">Users</span>
  </div>

  <!-- Search -->
  <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <LocalSearch v-model="search" label="Search users" :options="nickValues" />
  </div>

  <div class="p-4 overflow-y-auto" style="height: 65vh">
    <div :class="['flex flex-col gap-2', screen.xs ? 'gap-1' : '']">
      <template v-if="busy">
        <div
          v-for="n in 5"
          :key="n"
          class="flex items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
        >
          <div class="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full mr-3"></div>
          <div class="flex-grow">
            <div class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
          </div>
          <div v-if="screen.gtXs" class="flex gap-1 ml-auto">
            <div class="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <div class="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          </div>
          <div class="flex gap-1 ml-auto" :class="screen.xs ? 'flex-col' : 'flex-row'">
            <div class="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div class="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div class="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </template>

      <div
        v-for="item in filteredResult"
        :key="item.uid"
        v-else
        class="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div class="flex-shrink-0 mr-3">
          <AppBadge color="warning" textColor="black" class="text-sm px-2 py-1">
            {{ contribution(item.nick) }}
          </AppBadge>
        </div>

        <div class="flex-grow">
          <div class="flex items-center gap-1 text-base font-semibold">
            {{ item.nick || '???' }}
            <AppButton
              v-if="contribution(item.nick) === 0"
              flat
              round
              dense
              icon="sym_r_edit"
              color="primary"
              @click="openNickDialog(item)"
            >
              <span class="text-xs">Change nickname</span>
            </AppButton>
            <AppButton
              v-if="contribution(item.nick) === 0"
              flat
              round
              dense
              icon="sym_r_delete"
              color="negative"
              @click="confirmDeleteUser(item)"
            >
              <span class="text-xs">Delete user</span>
            </AppButton>
          </div>
          <div class="text-xs text-gray-500">{{ item.email }}</div>
          <div class="text-xs text-gray-400">subscribed {{ ageDays(item.timestamp) }} days ago</div>
        </div>

        <div v-if="screen.gtXs" class="flex-shrink-0 ml-3 flex gap-1">
          <template v-if="item.timestamps?.length">
            <AppBadge v-for="(timestamp, index) in item.timestamps" :key="index" color="secondary">
              {{ ageDays(timestamp) }}
            </AppBadge>
          </template>
          <AppBadge v-else color="grey">no tokens</AppBadge>
        </div>

        <div
          class="flex-shrink-0 ml-3 flex gap-x-3"
          :class="screen.xs ? 'flex-col gap-y-1' : 'flex-row'"
        >
          <label class="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              v-model="item.isAdmin"
              :disabled="user?.email === item.email || !item.nick"
              class="w-4 h-4 rounded border-gray-300 text-negative focus:ring-negative"
              @change="toggleAdmin(item, item.isAdmin)"
            />
            <span class="text-xs">Admin</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              v-model="item.isAuthorized"
              :disabled="!item.nick"
              class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              @change="item.nick ? auth.updateUser(item, 'isAuthorized') : null"
            />
            <span class="text-xs">Editor</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              v-model="item.allowPush"
              :disabled="!item.nick"
              class="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
              @change="item.nick ? auth.updateUser(item, 'allowPush') : null"
            />
            <span class="text-xs">Push</span>
          </label>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete User Confirmation Dialog -->
  <Dialog :open="showDeleteDialog" @close="showDeleteDialog = false" class="relative z-50">
    <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel
        class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div class="p-6">
          <div class="text-lg font-bold mb-2">Delete user?</div>
          <p class="text-gray-600 dark:text-gray-400">
            Remove <strong class="text-black dark:text-white">{{ userToDelete?.nick }}</strong> ({{
              userToDelete?.email
            }})? This cannot be undone.
          </p>
        </div>
        <div class="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
          <AppButton flat label="Cancel" @click="showDeleteDialog = false" />
          <AppButton flat label="Delete" color="negative" @click="doDeleteUser" />
        </div>
      </DialogPanel>
    </div>
  </Dialog>

  <!-- Nickname Edit Dialog -->
  <Dialog :open="showNickDialog" @close="showNickDialog = false" class="relative z-50">
    <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel
        class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div class="p-6">
          <div class="text-lg font-bold mb-4">Change nickname for {{ userToEdit?.email }}</div>
          <AppInput
            v-model="tempNick"
            label="New nickname"
            autofocus
            clearable
            :rules="[
              (v: string) => !!v || 'Nickname cannot be empty',
              (v: string) => !nickValues.includes(v) || 'Nickname already taken',
            ]"
            @keyup.enter="saveNick"
          />
        </div>
        <div class="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
          <AppButton flat label="Cancel" @click="showNickDialog = false" />
          <AppButton
            flat
            label="Save"
            @click="saveNick"
            :disabled="!tempNick || nickValues.includes(tempNick)"
          />
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useValuesStore } from '../../stores/values'
import { useUserStore } from '../../stores/user'

import ErrorBanner from '../ErrorBanner.vue'
import type { UsersAndDevices } from '../../helpers/models'
import type { Timestamp } from 'firebase/firestore'

import LocalSearch from '../LocalSearch.vue'
import notify from '../../helpers/notify'

import AppBadge from '../atoms/AppBadge.vue'
import AppButton from '../atoms/AppButton.vue'
import AppInput from '../atoms/AppInput.vue'
import AppIcon from '../atoms/AppIcon.vue'
import { Dialog, DialogPanel } from '@headlessui/vue'
import { useScreen } from '../../composables/useScreen'

const meta = useValuesStore()
const auth = useUserStore()
const screen = useScreen()

const busy = ref(false)
const error = ref('')
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

const adminCount = computed(() => result.value.filter((u) => u.isAdmin).length)

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
    if (userToDelete.value.isAdmin && adminCount.value === 1) {
      notify({ type: 'negative', message: 'Cannot delete the only admin user' })
      showDeleteDialog.value = false
      return
    }
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

const toggleAdmin = async (item: UsersAndDevices, val: boolean) => {
  const remainingAdmins = result.value.filter((u) => u.isAdmin).length
  if (!val && remainingAdmins === 0) {
    notify({ type: 'negative', message: 'Cannot remove the last administrator' })
    item.isAdmin = true
    return
  }
  await auth.updateUser(item, 'isAdmin')
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
