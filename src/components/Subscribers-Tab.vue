<template>
  <div class="text-h6 q-pa-md">Subscribers</div>
  <q-banner
    v-if="result.length === 0"
    class="fixed-center text-center bg-warning q-pa-md"
    style="z-index: 100"
    rounded
  >
    <q-icon name="error_outline" size="4em" />
    <div class="text-h6">No Subscribers found</div>
  </q-banner>

  <q-list separator>
    <q-item v-for="item in result" :key="item.key" clickable>
      <q-item-section>
        <q-item-label>{{ item.email }}</q-item-label>
        <q-item-label>subscribed {{ ageDays(item.timestamp.toMillis()) }} days ago</q-item-label>
        <q-item-label caption>
          {{ countTokens(item.timestamps) }}
          <template v-for="(timestamp, index) in item.timestamps" :key="index">
            {{ ageDays(timestamp.toMillis()) }}
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
import { useUserStore } from '../stores/user'
import type { SubscriberAndDevices } from '../helpers/models'

const auth = useUserStore()
const result = ref<SubscriberAndDevices[]>([])

const fetchList = async () => {
  const subscribersAndDevices = await auth.fetchSubscribersAndDevices()
  result.value = subscribersAndDevices ?? []
}

onMounted(fetchList)

const remove = async (subscriber: SubscriberAndDevices) => {
  await auth.removeSubscriber(subscriber)
  result.value = result.value.filter((item) => item.key !== subscriber.key)
}

const ageDays = (timestamp: number) => {
  const diff = Date.now() - timestamp
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
const countTokens = (timestamps: { toMillis: () => number }[]) => {
  return timestamps.length > 0 ? `${timestamps.length} tokens:` : 'No tokens'
}
const toggle = async (subscriber: SubscriberAndDevices) => {
  await auth.toggleAllowPush(subscriber)
  // fetchList()
}
</script>
