<template>
  <router-view />
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from './stores/app'
import { useValuesStore } from './stores/values'
import { useUserStore, resolveAuthReady } from './stores/user'
import { useBucketStore } from './stores/bucket'
import { messaging } from './firebase'
import notify from './helpers/notify'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { onMessage } from 'firebase/messaging'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const bucketStore = useBucketStore()
const { busy, error, showEdit, showConfirm } = storeToRefs(app)

onMounted(() => {
  app.initTheme()
  // Reset transient UI state immediately on mount
  busy.value = false
  error.value = ''
  showEdit.value = false
  showConfirm.value = false

  // Load backend statistics, last record, and filter values asynchronously in the background in parallel.
  // This avoids blocking the initial page mount/render and allows the app to load instantly
  // using the persisted cache from LocalStorage.
  void Promise.all([
    bucketStore.bucketRead(),
    app.getLast(),
    meta.readValues(),
  ])
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
    resolveAuthReady()
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
      icon: 'sym_r_notifications',
      caption: payload.messageId,
    })
  } else {
    if (process.env.DEV) console.log('FCM message received:', payload)
  }
})
</script>
