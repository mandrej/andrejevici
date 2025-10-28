<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <div class="row justify-between q-pa-md">
    <div class="text-h6">Messages</div>
    <q-btn
      color="primary"
      label="Delete Selected"
      :disable="selectedItems.length === 0"
      @click="app.deleteMessages(selectedItems).then(fetchList)"
    />
  </div>

  <q-list separator>
    <q-item v-for="item in result" :key="item.key" clickable>
      <q-item-section avatar v-if="item.status">
        <q-icon color="positive" name="check" />
      </q-item-section>
      <q-item-section avatar v-else>
        <q-icon color="negative" name="priority_high" />
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-subtitle1">{{
          item.status ? item.message : item.text
        }}</q-item-label>
        <q-item-label
          >from {{ item.email }} -
          {{ formatDatum(item.timestamp.toDate(), 'DD.MM.YYYY HH:mm') }}</q-item-label
        >
      </q-item-section>
      <q-item-section side>
        <q-checkbox v-model="selectedItems" :val="item.key" />
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { formatDatum } from '../helpers'
const result = ref<MessageType[]>([])
import ErrorBanner from './Error-Banner.vue'
import type { MessageType } from '../helpers/models'

const app = useAppStore()
const { busy, error } = storeToRefs(app)
const selectedItems = ref<string[]>([])

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

<style scoped></style>
