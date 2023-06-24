<template>
  <q-page class="flex flex-center column">
    <q-btn :click="userStore.signIn">SignIn</q-btn>
    <pre>{{ user }}</pre>
  </q-page>
</template>

<script setup>
import { computed } from "vue";
import { useUserStore } from "src/stores/user";

const userStore = useUserStore();
const user = computed(() => userStore.user);
</script>
