<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { useBucketStore } from "./stores/bucket";
import { useCrudStore } from "./stores/crud";
import { getMessaging, onMessage } from "firebase/messaging";
import notify from "./helpers/notify";

const messaging = getMessaging();
const bucketStore = useBucketStore();
const crudStore = useCrudStore();

onMounted(() => {
  bucketStore.scretch();
  crudStore.getLast();
  crudStore.counters2store();
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
