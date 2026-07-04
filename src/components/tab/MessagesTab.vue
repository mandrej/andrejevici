<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <!-- Header banner -->
  <div
    class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
  >
    <div class="flex items-center gap-2">
      <AppIcon name="add_alert" class="w-5 h-5 text-primary" />
      <span class="text-base font-semibold text-gray-900 dark:text-white">Messages</span>
    </div>
    <AppButton
      flat
      color="negative"
      icon="delete"
      label="Delete Selected"
      :disabled="selectedItems.length === 0"
      @click="deleteMessages(selectedItems)"
    />
  </div>

  <!-- Search -->
  <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <LocalSearch v-model="search" label="Search messages" :options="options" />
  </div>

  <!-- Message list -->
  <div class="overflow-y-auto" style="height: 65vh">
    <!-- Skeleton loading -->
    <template v-if="busy">
      <div
        v-for="n in 5"
        :key="n"
        class="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800"
      >
        <div class="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div class="flex-1">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5 mb-2 animate-pulse" />
          <div class="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/5 mb-1 animate-pulse" />
          <div class="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/5 animate-pulse" />
        </div>
        <div class="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </template>

    <!-- Actual items -->
    <div
      v-for="item in filteredResult"
      :key="item.key"
      class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <AppIcon
        :name="item.status ? 'check' : 'priority_high'"
        :class="['w-5 h-5 flex-shrink-0', item.status ? 'text-positive' : 'text-negative']"
      />

      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {{ item.message }}
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400 truncate">{{ item.text }}</div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {{ formatDatum(item.timestamp.toDate(), 'DD.MM.YYYY HH:mm') }}
        </div>
      </div>

      <AppCheckbox v-model="selectedItems" :val="item.key" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { formatDatum } from '../../helpers'
import ErrorBanner from '../ErrorBanner.vue'
import type { MessageType } from '../../helpers/models'
import LocalSearch from '../LocalSearch.vue'
import AppButton from '../atoms/AppButton.vue'
import AppCheckbox from '../atoms/AppCheckbox.vue'
import AppIcon from '../atoms/AppIcon.vue'
import { doc, query, limit, orderBy, writeBatch, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { messageCollection } from '../../helpers/collections'
import notify from '../../helpers/notify'

const app = useAppStore()
const { busy, error } = storeToRefs(app)
const result = ref<MessageType[]>([])
const selectedItems = ref<string[]>([])
const search = ref('')

const options = computed(() => {
  const allMessages = result.value.map((item) => item.message)
  return [...new Set(allMessages)].sort()
})

const filteredResult = computed(() => {
  if (!search.value) return result.value
  return result.value.filter((item) =>
    item.message.toLowerCase().includes(search.value.toLowerCase()),
  )
})

const deleteMessages = async (keys: string[]) => {
  const batch = writeBatch(db)
  for (const key of keys) {
    batch.delete(doc(messageCollection, key))
  }
  await batch.commit()
  notify({ type: 'positive', message: `Deleted ${keys.length} messages`, icon: 'sym_r_check' })
  selectedItems.value = []
}

let unsubscribe: (() => void) | null = null

const startListening = () => {
  busy.value = true
  error.value = ''
  unsubscribe = onSnapshot(
    query(messageCollection, orderBy('timestamp', 'desc'), limit(50)),
    (snapshot) => {
      result.value = snapshot.docs.map((d) => ({ ...(d.data() as MessageType), key: d.id }))
      busy.value = false
      error.value = result.value.length === 0 ? 'No messages found' : ''
    },
    (err) => {
      console.error('Error listening to messages:', err)
      error.value = err.message
      busy.value = false
    },
  )
}

onMounted(startListening)

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})
</script>
