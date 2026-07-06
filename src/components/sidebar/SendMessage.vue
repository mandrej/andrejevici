<template>
  <div class="flex items-end gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 transition-colors">
    <div class="flex-grow">
      <AppInput v-model="message" label="Send message to subscribers" />
    </div>
    <div class="flex items-end">
      <AppButton :disabled="!token" label="Send" @click="send" color="secondary" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../../stores/user'
import CONFIG from '../../config'
import notify from '../../helpers/notify'
import AppButton from '../atoms/AppButton.vue'
import AppInput from '../atoms/AppInput.vue'

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
    body: JSON.stringify({ text: msg, from: auth.user?.email || '' }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response.json()
    })
    .then((results) => {
      if (Array.isArray(results)) {
        if (results.length === 0) {
          notify({
            type: 'info',
            message: 'No subscribers found',
            icon: 'sym_r_info',
          })
          return
        }
        results.forEach((res) => {
          let msgText = `From: ${res.from}\nTo: ${res.to}\nStatus: ${res.status ? 'Success' : 'Failed'}`
          if (!res.status && typeof res.days === 'number') {
            msgText += `\nExpired token: ${res.days} days ago`
          }
          notify({
            type: res.status ? 'positive' : 'negative',
            message: msgText,
            multiLine: true,
            icon: res.status ? 'sym_r_check' : 'sym_r_error',
          })
        })
      } else {
        notify({
          type: 'positive',
          message: 'Notification sent successfully',
          icon: 'sym_r_check',
        })
      }
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      notify({ type: 'negative', timeout: 0, message: `Failed to send message: ${errorMessage}` })
    })
}
</script>
