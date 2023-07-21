<template>
  <router-view />
</template>
<script setup>
import { computed, onMounted } from "vue";
import { useAppStore } from "./stores/app";
import { useValuesStore } from "./stores/values";
import { getMessaging, onMessage } from "firebase/messaging";
import { isEmpty } from "lodash";
import notify from "./helpers/notify";

const messaging = getMessaging();
const app = useAppStore();
const valuesStore = useValuesStore();
const bucket = computed(() => app.bucket);

onMounted(() => {
  if (isEmpty(bucket) || bucket.value.count === 0) {
    app.scretch();
  }
  app.read();
  app.getLast();
  app.getSince();
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
