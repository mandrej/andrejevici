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
import notify from './helpers/notify'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { busy, error, showEdit, showConfirm } = storeToRefs(app)
const { user } = storeToRefs(auth)

messageListener()
  .then((payload: any) => {
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
  error.value = null
  showEdit.value = false
  showConfirm.value = false
})
</script>
