<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { useAppStore } from "./stores/app";
import { useValuesStore } from "./stores/values";
import { useUserStore } from "./stores/user";
import { getMessaging, onMessage } from "firebase/messaging";
import notify from "./helpers/notify";

const app = useAppStore();
const auth = useUserStore();
const meta = useValuesStore();
const messaging = getMessaging();

onMounted(() => {
  meta.countersRead();
  app.bucketRead();
  app.getLast();
  app.getSince();
  auth.checkSession();
  Notification.requestPermission().then((permission) =>
    auth.fetchFCMToken(permission)
  );
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
