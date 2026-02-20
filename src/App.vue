<template>
  <router-view />
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import { useUserStore } from 'src/stores/user'
import { messaging } from 'src/boot/firebase'
import notify from 'src/helpers/notify'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { onMessage } from 'firebase/messaging'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { busy, error, showEdit, showConfirm } = storeToRefs(app)

onMounted(() => {
  app.initTheme()
  app.getLast()
  app.bucketRead()
  meta.readValues()
  // Reset transient UI state on mount
  busy.value = false
  error.value = ''
  showEdit.value = false
  showConfirm.value = false
})

/**
 * Reacts to Firebase auth state changes.
 * - On sign-in: stores the user, then silently refreshes the FCM token if push is allowed,
 *   or prompts for consent if the login interval has elapsed.
 * - On sign-out: clears all user and push state.
 */
onAuthStateChanged(getAuth(), (usr) => {
  if (usr) {
    auth
      .storeUser(usr)
      .then(() => {
        if (auth.allowPush) {
          // User already consented — silently refresh the FCM token.
          // refreshToken() guards itself if swRegistration isn't set yet.
          void auth.refreshToken()
        }
        // If auth.askPush is true after storeUser, the Ask-Permission dialog
        // will appear automatically via its watcher on the askPush store ref.
      })
      .catch((err) => {
        console.error('Error storing user:', err)
      })
  } else {
    auth.user = null
    auth.token = null
    auth.askPush = false
    auth.allowPush = false
  }
})

/**
 * Handles foreground FCM messages and surfaces them as in-app notifications.
 */
onMessage(messaging, (payload) => {
  if (payload.data?.body) {
    notify({
      type: 'external',
      message: payload.data.body,
      icon: 'notifications',
      caption: payload.messageId,
    })
  } else {
    if (process.env.DEV) console.log('FCM message received:', payload)
  }
})
</script>
