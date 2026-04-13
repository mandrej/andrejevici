<template>
  <ErrorBanner :inquiry="!busy && error != ''">
    <template #title>{{ error }}</template>
  </ErrorBanner>

  <PageTitle title="Messages" icon="sym_r_add_alert">
    <template #action>
      <q-btn
        flat
        color="primary"
        icon="sym_r_delete"
        label="Delete Selected"
        :disable="selectedItems.length === 0"
        @click="app.deleteMessages(selectedItems).then(fetchList)"
      />
    </template>
  </PageTitle>

  <div class="q-px-md q-pb-md">
    <LocalSearch v-model="search" label="Search messages" :options="options" />
  </div>

  <q-scroll-area class="q-pa-md" style="height: 65vh">
    <q-list separator>
      <q-item v-for="item in filteredResult" :key="item.key" clickable>
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
import PageTitle from '../PageTitle.vue'
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

<style scoped></style>
