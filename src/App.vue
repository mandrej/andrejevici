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
import { CONFIG } from 'src/helpers'
import notify from 'src/helpers/notify'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { onMessage, getToken } from 'firebase/messaging'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { busy, error, showEdit, showConfirm } = storeToRefs(app)

onMounted(() => {
  app.getLast()
  app.bucketRead()
  meta.readValues()
  // RESET
  busy.value = false
  error.value = ''
  showEdit.value = false
  showConfirm.value = false

  /**
   * @description
   * Listens for authentication state changes and stores the user.
   */
  onAuthStateChanged(getAuth(), (usr) => {
    // onAuthStateChanged was always triggered after 1 hour and the user was disconnected.
    if (usr) {
      auth
        .storeUser(usr)
        .then(() => {
          if (auth.allowPush) {
            onNewToken()
          }
        })
        .catch((err) => {
          console.error('Error storing user:', err)
        })
    } else {
      auth.user = null
      auth.askPush = false
      auth.allowPush = false
    }
    auth.getEmailNickMap()
  })

  /**
   * @description
   * Gets a new token and updates the device.
   */
  const onNewToken = () => {
    getToken(messaging, { vapidKey: CONFIG.firebase.vapidKey })
      .then((token) => {
        if (token) {
          auth.updateDevice(token).catch((err) => {
            console.error('Error updating device token:', err)
          })
        } else {
          auth.askPush = true
        }
      })
      .catch((err) => {
        notify({
          type: 'negative',
          message: 'An error occurred while retrieving token.',
          caption: err,
          icon: 'error',
        })
      })
  }

  /**
   * @description
   * Listens for messages and shows a notification.
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
      if (process.env.DEV) console.log(payload)
    }
  })
})
</script>
