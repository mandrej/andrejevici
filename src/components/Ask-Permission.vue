<template>
  <q-dialog
    v-model="open"
    transition-show="slide-down"
    transition-hide="slide-up"
    persistent
  >
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

<script setup>
import { ref } from "vue";
import { CONFIG } from "../helpers";
import notify from "../helpers/notify";
import { useUserStore } from "../stores/user";
import { getMessaging, getToken } from "firebase/messaging";

const auth = useUserStore();
const messaging = getMessaging();
const open = ref(true);

const props = defineProps({
  model: Boolean,
});

const disableNotification = async () => {
  auth.user.allowPush = false;
  auth.user.askPush = false;
  auth.token = null;
  auth.removeDevice();
  await auth.updateUser();
};
// const askLater = async () => {
//   open.value = false;
//   auth.user.askPush = true;
//   await auth.updateUser();
// };
const enableNotifications = () => {
  Notification.requestPermission().then(async (permission) => {
    if (permission === "granted") {
      // When stale tokens reach 270 days of inactivity, FCM will consider them expired tokens.
      const token = await getToken(messaging, {
        vapidKey: CONFIG.firebase.vapidKey,
      });
      if (token) {
        auth.token = token;
        await auth.updateDevice();

        auth.user.allowPush = true;
        auth.user.askPush = false;
        await auth.updateUser();
      } else {
        auth.user.allowPush = true;
        auth.user.askPush = true;
        await auth.updateUser();

        notify({
          type: "negative",
          multiLine: true,
          message: `Unable to retrieve token`,
        });
      }
    }
  });
};
</script>
