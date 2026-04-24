<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <q-banner class="q-pa-md" inline-actions>
    <template v-slot:avatar>
      <q-icon name="sym_r_add_alert" />
    </template>
    <span class="text-h6">Messages</span>
    <template v-slot:action>
      <q-btn
        flat
        color="primary"
        icon="sym_r_delete"
        label="Delete Selected"
        :disable="selectedItems.length === 0"
        @click="app.deleteMessages(selectedItems).then(fetchList)"
      />
    </template>
  </q-banner>

  <div class="q-px-md q-pb-md">
    <LocalSearch v-model="search" label="Search messages" :options="options" />
  </div>

  <q-scroll-area class="q-pa-md" style="height: 65vh">
    <q-list separator>
      <template v-if="busy">
        <q-item v-for="n in 5" :key="n">
          <q-item-section avatar>
            <q-skeleton type="circle" size="24px" />
          </q-item-section>
          <q-item-section>
            <q-item-label>
              <q-skeleton type="text" width="60%" />
            </q-item-label>
            <q-item-label caption>
              <q-skeleton type="text" width="90%" />
            </q-item-label>
            <q-item-label caption>
              <q-skeleton type="text" width="40%" />
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-skeleton type="QCheckbox" />
          </q-item-section>
        </q-item>
      </template>

      <q-item v-for="item in filteredResult" :key="item.key" clickable v-else>
        <q-item-section avatar v-if="item.status">
          <q-icon color="positive" name="sym_r_check" />
        </q-item-section>
        <q-item-section avatar v-else>
          <q-icon color="negative" name="sym_r_priority_high" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-subtitle1">{{ item.message }}</q-item-label>
          <q-item-label class="text-subtitle2">{{ item.text }}</q-item-label>
          <q-item-label>{{
            formatDatum(item.timestamp.toDate(), 'DD.MM.YYYY HH:mm')
          }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-checkbox v-model="selectedItems" :val="item.key" />
        </q-item-section>
      </q-item>
    </q-list>
  </q-scroll-area>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { formatDatum } from '../../helpers'
import ErrorBanner from '../ErrorBanner.vue'
import type { MessageType } from '../../helpers/models'

import LocalSearch from '../LocalSearch.vue'

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

const fetchList = async () => {
  busy.value = true
  error.value = ''
  result.value = await app.fetchMessages()
  busy.value = false
  error.value = result.value.length === 0 ? 'No messages found' : ''
  selectedItems.value = []
}

onMounted(fetchList)
</script>
