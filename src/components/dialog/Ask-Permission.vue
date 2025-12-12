<template>
  <SmallDialog
    :trigger="showConsent"
    title="Accept notifications"
    message="Would you like to enable push notifications?"
    :progress="wait"
  >
    <template #action>
      <q-btn flat label="Disable" @click="disableNotification" />
      <q-btn flat label="Enable" @click="enableNotifications" />
    </template>
  </SmallDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { CONFIG } from 'src/helpers'
import notify from 'src/helpers/notify'
import { useUserStore } from 'src/stores/user'
import { getMessaging, getToken } from 'firebase/messaging'
import SmallDialog from 'src/layouts/Small-Dialog.vue'

const auth = useUserStore()
const messaging = getMessaging()
const { askPush } = storeToRefs(auth)
const showConsent = ref(Boolean('Notification' in window && askPush.value))
const wait = ref(false)

// Keep showConsent in sync with askPush
watch(askPush, (newVal) => {
  showConsent.value = Boolean('Notification' in window && newVal)
})

const disableNotification = async () => {
  auth.askPush = false
  auth.allowPush = false
  await auth.updateSubscriber()
  await auth.removeDevice()
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
      wait.value = false
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
