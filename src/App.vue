<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { useAppStore } from "./stores/app";
import { useValuesStore } from "./stores/values";
import { getMessaging, onMessage } from "firebase/messaging";
import notify from "./helpers/notify";

const app = useAppStore();
const meta = useValuesStore();
const messaging = getMessaging();

onMounted(() => {
  app.refresh();
  meta.counters2store();
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
