<template>
  <router-view />
</template>
<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-explicit-any */
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from './stores/app'
import { useValuesStore } from './stores/values'
import { useUserStore } from './stores/user'
import { messageListener } from './boot/fire'
import { CONFIG } from './helpers'
import notify from './helpers/notify'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getMessaging, getToken } from 'firebase/messaging'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const messaging = getMessaging()
const { busy, error, showEdit, showConfirm } = storeToRefs(app)

messageListener()
  .then((payload: any) => {
    const params = {
      type: 'external',
      message: payload.data.body,
      icon: 'notifications',
      caption: payload.messageId,
    }
    notify(params)
  })
  .catch((err) => {
    notify({
      type: 'negative',
      message: 'An error occurred while listening for messages.',
      caption: err,
      icon: 'error',
    })
  })

onAuthStateChanged(getAuth(), async (usr) => {
  // onAuthStateChanged was always triggered after 1 hour and the user was disconnected.
  if (usr) {
    await auth.storeUser(usr)
    if (auth.allowPush) {
      onNewToken()
    }
  } else {
    auth.user = null
    auth.askPush = false
    auth.allowPush = false
  }
})

const onNewToken = () => {
  getToken(messaging, { vapidKey: CONFIG.firebase.vapidKey })
    .then((token) => {
      if (token) {
        auth.updateDevice(token)
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

onMounted(async () => {
  await app.getLast()
  await meta.fieldCount('year')
  await meta.fieldCount('email')
  // in Index-Page
  // await meta.fieldCount('tags')
  // await meta.fieldCount('model')
  // await meta.fieldCount('lens')
  await app.bucketRead()
  // RESET
  busy.value = false
  error.value = ''
  showEdit.value = false
  showConfirm.value = false
})
</script>
