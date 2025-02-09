<template>
  <q-dialog v-model="open" transition-show="slide-down" transition-hide="slide-up" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <q-icon name="img:icons/favicon-96x96.png" size="56px" />
        <span class="q-ml-md">Would you like to enable notifications?</span>
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

defineProps({
  model: Boolean,
})

const { user, token } = storeToRefs(auth)

const disableNotification = async () => {
  user.value.allowPush = false
  user.value.askPush = false
  token.value = null
  auth.removeDevice()
  await auth.updateUser()
}
// const askLater = async () => {
//   open.value = false;
//   user.value.askPush = true;
//   await auth.updateUser();
// };
const enableNotifications = () => {
  Notification.requestPermission().then(async (permission) => {
    if (permission === 'granted') {
      // When stale tokens reach 270 days of inactivity, FCM will consider them expired tokens.
      const tok = await getToken(messaging, {
        vapidKey: CONFIG.firebase.vapidKey,
      })
      if (tok) {
        token.value = tok
        await auth.updateDevice()

        user.value.allowPush = true
        user.value.askPush = false
        await auth.updateUser()
      } else {
        user.value.allowPush = true
        user.value.askPush = true
        await auth.updateUser()

        notify({
          type: 'negative',
          multiLine: true,
          message: `Unable to retrieve token`,
        })
      }
    }
  })
}
</script>
