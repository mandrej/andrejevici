<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { useAppStore } from "./stores/app";
import { getMessaging, onMessage } from "firebase/messaging";
import notify from "./helpers/notify";

const messaging = getMessaging();
const app = useAppStore();

onMounted(() => {
  app.fetchStat();
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
