<template>
  <router-view />
</template>
<script setup>
import { onMounted } from "vue";
import { useBucketStore } from "./stores/bucket";
import { useCrudStore } from "./stores/crud";
import { useValuesStore } from "./stores/values";
import { getMessaging, onMessage } from "firebase/messaging";
import notify from "./helpers/notify";

const messaging = getMessaging();
const bucketStore = useBucketStore();
const crudStore = useCrudStore();
const valuesStore = useValuesStore();

onMounted(() => {
  console.log("APP");
  bucketStore.read();
  crudStore.getLast();
  valuesStore.counters2store();
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
