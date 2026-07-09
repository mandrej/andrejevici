<template>
  <div
    class="flex items-end gap-2 p-2 pb-6 rounded-lg bg-gray-50 dark:bg-gray-800 transition-colors"
  >
    <div class="grow">
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
import { formatDatum, getNickFromEmail } from '../../helpers'

const auth = useUserStore()
const { token } = storeToRefs(auth)
const message = ref('TEST')

const send = async () => {
  const msg = message.value.trim()
  if (msg === '') {
    notify({ type: 'warning', message: 'No message provided' })
    return
  }

  try {
    const response = await fetch(CONFIG.notifyUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: msg, from: auth.user?.email || '' }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const results = await response.json()

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
        let msgText = `sent to ${res.to}`
        msgText +=
          !res.status && typeof res.days === 'number'
            ? ` removed expired token ${res.days} days old`
            : ` successfully`
        gtag('event', 'push_message', {
          from: auth.user?.nick,
          when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
          message: msg,
          to: getNickFromEmail(res.to),
          text: msgText,
        })
      })
    }
    notify({
      type: 'positive',
      message: 'Notification sent successfully',
      icon: 'sym_r_check',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    notify({ type: 'negative', timeout: 0, message: `Failed to send message: ${errorMessage}` })
  }
}
</script>
