<template>
  <div class="text-h6 q-pa-md">Subscribers</div>
  <q-list separator>
    <q-item v-for="item in result" :key="item.key">
      <q-item-section>
        <q-item-label>{{ item.email }}</q-item-label>
        <q-item-label caption
          >Subscribed {{ ageDays(item.timestamp.toMillis()) }} days ago</q-item-label
        >
      </q-item-section>
      <q-item-section v-if="$q.screen.gt.xs" lines>
        <q-list dense>
          <q-item v-for="(timestamp, index) in item.timestamps" :key="index">
            <q-item-section>token {{ ageDays(timestamp.toMillis()) }} days old</q-item-section>
          </q-item>
          <q-item v-if="item.timestamps.length === 0">
            <q-item-section>No tokens</q-item-section>
          </q-item>
        </q-list>
      </q-item-section>
      <q-item-section>
        <q-checkbox
          class="self-end"
          disable
          name="`allow-${item.key}`"
          v-model="item.allowPush"
          label="Allow Push"
        />
      </q-item-section>
      <q-item-section>
        <q-btn class="self-end" icon="delete" @click="remove(item)" color="primary" flat />
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
</script>
