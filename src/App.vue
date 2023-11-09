<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { useAppStore } from "./stores/app";
import { useUserStore } from "./stores/user";
import { messageListener } from "./boot/fire";
import notify from "./helpers/notify";

const app = useAppStore();
const auth = useUserStore();

messageListener()
  .then((payload) => {
    console.log(payload);
    const params = {
      type: "external",
      message: payload.data.body,
      icon: "notifications",
      caption: payload.messageId,
    };
    notify(params);
  })
  .catch((err) => console.log("failed: ", err));

onMounted(() => {
  app.getLast();
  app.getSince();
  app.bucketRead();
  auth.checkSession();

  if ("Notification" in window && Notification.permission === "granted") {
    if (auth.user && auth.allow_push) {
      auth.fetchFCMToken();
    }
  }
});
</script>
