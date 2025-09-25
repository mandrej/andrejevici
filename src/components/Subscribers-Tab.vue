<template>
  <div class="text-h6 q-pa-md">Subscribers</div>
  <q-list separator>
    <q-item v-for="item in result" :key="item.key">
      <q-item-section>
        <q-item-label>{{ item.email }}</q-item-label>
        <q-item-label caption>{{ item.timestamp.toDate().toLocaleString() }}</q-item-label>
      </q-item-section>
      <q-item-section>{{ item.devices }} devices</q-item-section>
      <q-item-section
        ><q-checkbox disable name="`allow-${item.key}`" v-model="item.allowPush" label="Allow Push"
      /></q-item-section>
      <q-section>
        <q-btn label="Remove" @click="remove(item)" color="primary" />
      </q-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import type { SubscriberAndDevices } from '../helpers/models'

const auth = useUserStore()
const result = ref<SubscriberAndDevices[]>([])

onMounted(async () => {
  const subscribersAndDevices = await auth.fetchSubscribersAndDevices()
  result.value = subscribersAndDevices ?? []
})

const remove = async (subscriber: SubscriberAndDevices) => {
  await auth.removeSubscriber(subscriber)
}
</script>
