<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { getMessaging, onMessage } from "firebase/messaging";
import notify from "./helpers/notify";

const messaging = getMessaging();

onMounted(() => {
  onMessage(messaging, (payload) => {
    const params = {
      type: "ongoing",
      message: payload.notification.body,
    };
    if (payload.data && payload.data.group) {
      params.group = payload.data.group;
    }
    notify(params);
  });
});
</script>
