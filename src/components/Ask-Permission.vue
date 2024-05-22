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
import { useUserStore } from "../stores/user";

const auth = useUserStore();
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
      await auth.fetchFCMToken();
    } else {
      auth.user.allowPush = true;
      auth.user.askPush = true;
      await auth.updateUser();
    }
  });
};
</script>
