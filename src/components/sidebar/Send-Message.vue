<template>
  <q-item clickable>
    <q-item-section>
      <q-input v-model="message" label="Send message to subscribers" color="secondary" />
    </q-item-section>
    <q-item-section side>
      <q-btn :disabled="!token" label="Send" @click="send" color="secondary" text-color="black" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from 'src/stores/user'
import CONFIG from 'app/config'
import notify from 'src/helpers/notify'

const auth = useUserStore()
const { token } = storeToRefs(auth)
const message = ref('TEST')

const send = () => {
  const msg = message.value.trim()
  if (msg === '') {
    notify({ type: 'warning', message: 'No message provided' })
    return
  }

  fetch(CONFIG.notifyUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: msg }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response.text()
    })
    .then((text) => {
      // Use 'positive' type (green) and a fallback message if text is empty
      notify({
        type: 'positive',
        message: text || 'Notification sent successfully',
        icon: 'check',
      })
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      notify({ type: 'negative', message: `Failed to send message: ${errorMessage}` })
    })
}
</script>
