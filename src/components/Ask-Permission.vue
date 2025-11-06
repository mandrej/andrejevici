<template>
  <q-dialog v-model="open" transition-show="slide-down" transition-hide="slide-up" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <q-icon name="camera" size="56px" color="primary" />
        <span class="q-ml-md">Would you like to enable notifications?</span>
        <q-linear-progress v-if="wait" indeterminate color="warning" class="q-mt-sm" />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Disable" @click="disableNotification" />
        <q-btn flat label="Ask Later" @click="askLater" />
        <q-btn flat label="Enable" @click="enableNotifications" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CONFIG } from 'src/helpers'
import notify from 'src/helpers/notify'
import { useUserStore } from 'src/stores/user'
import { getMessaging, getToken } from 'firebase/messaging'

const auth = useUserStore()
const messaging = getMessaging()
const open = ref(true)
const wait = ref(false)

defineProps({
  model: Boolean,
})

const disableNotification = async () => {
  auth.askPush = false
  auth.allowPush = false
  await auth.updateSubscriber()
  await auth.removeDevice()
}
const askLater = async () => {
  // after loginDays ask again
  open.value = false
  auth.askPush = false
  auth.allowPush = false
  await auth.updateSubscriber()
}
const enableNotifications = async () => {
  try {
    // after loginDays ask again
    const permission = await Notification.requestPermission()

    if (permission === 'granted') {
      wait.value = true
      // When stale tokens reach 270 days of inactivity, FCM will consider them expired tokens.
      const token = await getToken(messaging, {
        vapidKey: CONFIG.firebase.vapidKey,
      })
      if (token) {
        auth.token = token
        auth.askPush = false
        auth.allowPush = true
        await auth.updateSubscriber()
        await auth.updateDevice(token)
      } else {
        notify({
          type: 'negative',
          multiLine: true,
          message: `Unable to retrieve token`,
        })
      }
      wait.value = false
    } else if (permission === 'denied') {
      // Handle denied permission
      auth.askPush = false
      auth.allowPush = false
      await auth.updateSubscriber()
      notify({
        type: 'warning',
        message: 'Notifications permission denied. You can enable it later in browser settings.',
      })
    }
  } catch (error) {
    console.error('Error enabling notifications:', error)
    wait.value = false
    auth.askPush = false
    auth.allowPush = false
    await auth.updateSubscriber()
    notify({
      type: 'negative',
      message: 'Failed to enable notifications. Please try again.',
    })
  }
}
</script>
