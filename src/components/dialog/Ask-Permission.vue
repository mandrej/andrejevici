<template>
  <q-dialog
    v-model="showConsent"
    transition-show="slide-down"
    transition-hide="slide-up"
    persistent
  >
    <q-card flat>
      <q-toolbar>
        <q-toolbar-title>Accept notifications</q-toolbar-title>
        <div class="absolute-bottom">
          <q-linear-progress v-if="wait" indeterminate color="warning" />
        </div>
      </q-toolbar>
      <q-card-section class="q-px-md q-pt-md">
        Would you like to enable push notifications?
      </q-card-section>
      <q-card-actions class="justify-between q-pa-md">
        <q-btn flat label="Disable" @click="disableNotification" />
        <q-btn flat label="Enable" @click="enableNotifications" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { CONFIG } from 'src/helpers'
import notify from 'src/helpers/notify'
import { useUserStore } from 'src/stores/user'
import { getMessaging, getToken } from 'firebase/messaging'

const auth = useUserStore()
const messaging = getMessaging()
const { askPush } = storeToRefs(auth)
const showConsent = ref(Boolean('Notification' in window && askPush.value))
const wait = ref(false)

// Keep showConsent in sync with askPush
watch(askPush, (newVal) => {
  showConsent.value = Boolean('Notification' in window && newVal)
})

const disableNotification = () => {
  auth.askPush = false
  auth.allowPush = false
  auth.updateSubscriber()
  auth.removeDevice()
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
        auth.updateSubscriber()
        auth.updateDevice(token)
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
      auth.updateSubscriber()
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
    auth.updateSubscriber()
    notify({
      type: 'negative',
      message: 'Failed to enable notifications. Please try again.',
    })
  }
}
</script>
