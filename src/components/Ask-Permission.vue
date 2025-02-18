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
        <!-- <q-btn flat label="Later" @click="askLater" /> -->
        <q-btn flat label="Enable" @click="enableNotifications" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CONFIG } from '../helpers'
import notify from '../helpers/notify'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../stores/user'
import { getMessaging, getToken } from 'firebase/messaging'

const auth = useUserStore()
const messaging = getMessaging()
const open = ref(true)
const wait = ref(false)

defineProps({
  model: Boolean,
})

const { user, token } = storeToRefs(auth)

const disableNotification = async () => {
  if (user.value) {
    user.value.allowPush = false
    user.value.askPush = false
    token.value = null
    auth.removeDevice()
    await auth.updateUser()
  }
}
// const askLater = async () => {
//   open.value = false;
//   user.value.askPush = true;
//   await auth.updateUser();
// };
const enableNotifications = () => {
  Notification.requestPermission().then(async (permission) => {
    if (permission === 'granted') {
      wait.value = true
      // When stale tokens reach 270 days of inactivity, FCM will consider them expired tokens.
      const tok = await getToken(messaging, {
        vapidKey: CONFIG.firebase.vapidKey,
      })
      if (tok) {
        token.value = tok
        if (user.value) {
          await auth.updateDevice(tok)
          user.value.allowPush = true
          user.value.askPush = false
          await auth.updateUser()
        }
      } else {
        if (user.value) {
          user.value.allowPush = true
          user.value.askPush = true
          await auth.updateUser()
        }
        notify({
          type: 'negative',
          multiLine: true,
          message: `Unable to retrieve token`,
        })
      }
      wait.value = false
    }
  })
}
</script>
