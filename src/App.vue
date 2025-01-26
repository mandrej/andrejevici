<template>
  <router-view />
</template>
<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from './stores/app'
import { useUserStore } from './stores/user'
import { messageListener } from './boot/fire'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import notify from './helpers/notify'

const app = useAppStore()
const auth = useUserStore()
const { busy, markerFileName, error, showEdit, showConfirm } = storeToRefs(app)
const { user } = storeToRefs(auth)

messageListener()
  .then((payload) => {
    console.log(payload)
    const params = {
      type: 'external',
      message: payload.data.body,
      icon: 'notifications',
      caption: payload.messageId,
    }
    notify(params)
  })
  .catch((err) => console.log('failed: ', err))

onAuthStateChanged(getAuth(), (usr) => {
  // onAuthStateChanged was always triggered after 1 hour and the user was disconnected.
  if (usr) {
    auth.storeUser(usr)
  } else {
    user.value = null
  }
})

onMounted(() => {
  app.getSince()
  app.bucketRead()
  // RESET
  busy.value = false
  markerFileName.value = null
  error.value = null
  showEdit.value = false
  showConfirm.value = false
})
</script>
