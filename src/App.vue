<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { useAppStore } from "./stores/app";
import { useValuesStore } from "./stores/values";
import { useUserStore } from "./stores/user";
import { getMessaging, onMessage } from "firebase/messaging";
import { isEmpty } from "lodash";
import notify from "./helpers/notify";

const app = useAppStore();
const auth = useUserStore();
const meta = useValuesStore();
const messaging = getMessaging();

onMounted(() => {
  app.refresh();
  auth.checkSession();
  if (isEmpty(app.bucket) || app.bucket.count === 0) {
    app.bucketBuild();
    meta.photos2counters2store();
  }
  try {
    Notification.requestPermission().then((permission) =>
      auth.fetchFCMToken(permission)
    );
  } catch (error) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API
    Notification.requestPermission(function (permission) {
      auth.fetchFCMToken(permission);
    });
  }
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
