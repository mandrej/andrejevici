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
        <q-btn flat label="Dismiss" @click="disableNotification" />
        <q-btn flat label="Later" @click="askLater" />
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

const disableNotification = () => {
  auth.user.ask_push = false;
  auth.user.allow_push = false;
  auth.token = null;
  auth.removeDevice();
  auth.updateUser();
};
const askLater = () => {
  open.value = false;
  auth.user.ask_push = true;
  auth.allow_push = false;
  auth.updateUser();
};
const enableNotifications = () => {
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      auth.fetchFCMToken();
    } else {
      auth.user.ask_push = true;
      auth.allow_push = false;
      auth.updateUser();
    }
  });
};
</script>
