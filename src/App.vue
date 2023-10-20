<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { useAppStore } from "./stores/app";
import { useUserStore } from "./stores/user";
import { onMessage } from "firebase/messaging";
import { messaging } from "./boot/fire";
import notify from "./helpers/notify";

const app = useAppStore();
const auth = useUserStore();

onMounted(() => {
  app.getLast();
  app.getSince();
  app.bucketRead();
  auth.checkSession();

  onMessage(messaging, (payload) => {
    console.log(payload);
    const params = {
      type: "external",
      message: payload.notification.body,
    };
    // if (payload.data && payload.data.group) {
    //   params.group = payload.data.group;
    // }
    notify(params);
  });
});
</script>
