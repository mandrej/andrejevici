<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { useAppStore } from "./stores/app";
import { useUserStore } from "./stores/user";
import { messageListener } from "./boot/fire";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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

onAuthStateChanged(getAuth(), (user) => {
  // onAuthStateChanged was always triggered after 1 hour and the user was disconnected.
  if (user) {
    auth.storeUser(user);
  } else {
    auth.user = null;
  }
});

onMounted(() => {
  app.getSince();
  app.bucketRead();
});
</script>
