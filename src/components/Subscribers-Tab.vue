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

  <div class="q-px-md" v-for="item in result" :key="item.key">
    <ButtonRow :wrap="false">
      <div class="text-subtitle1">{{ item.email }}</div>
      Subscribed {{ ageDays(item.timestamp.toMillis()) }} days ago<br />
      {{ countTokens(item.timestamps) }}
      <template v-for="(timestamp, index) in item.timestamps" :key="index">
        {{ ageDays(timestamp.toMillis()) }}
        <span v-if="index < item.timestamps.length - 1">, </span>
        <span v-else> days old </span>
      </template>

      <template #button>
        <q-checkbox
          disable
          name="`allow-${item.key}`"
          v-model="item.allowPush"
          label="Allow Push"
        />
        <q-btn style="width: auto" icon="delete" @click="remove(item)" color="primary" flat />
      </template>
    </ButtonRow>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import ButtonRow from '../components/Button-Row.vue'
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
</script>
