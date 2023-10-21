<template>
  <q-layout view="hHh Lpr lFf">
    <q-header class="fixed-top">
      <q-toolbar class="bg-grey-8 text-white">
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="drawer = !drawer"
        />
        <q-toolbar-title>
          <router-link to="/" style="color: inherit; text-decoration: none">{{
            $route.meta.title
          }}</router-link>
        </q-toolbar-title>

        <div v-if="$route.name === 'list'">{{ app.record.count }}</div>
        <q-btn
          v-else
          flat
          round
          icon="history"
          :to="{ name: 'list', query: app.find }"
        />
        <q-linear-progress
          v-show="app.busy"
          color="warning"
          class="absolute-bottom"
          indeterminate
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawer"
      class="column no-wrap"
      :width="320"
      show-if-above
      dark
    >
      <keep-alive>
        <component :is="$route.meta.sidebar || 'div'" />
      </keep-alive>
      <q-space />
      <Menu />
    </q-drawer>

    <q-page-container>
      <q-page>
        <q-dialog
          v-model="showAskBanner"
          transition-show="slide-down"
          transition-hide="slide-up"
          persistent
        >
          <q-card>
            <q-card-section class="row items-center">
              <q-icon name="img:icons/favicon-96x96.png" size="56px" />
              <span class="q-ml-md"
                >Would you like to enable notifications?</span
              >
            </q-card-section>

            <q-card-actions align="right">
              <q-btn flat label="Dismiss" @click="disableNotification" />
              <q-btn flat label="Later" @click="askLater" />
              <q-btn flat label="Enable" @click="enableNotifications" />
            </q-card-actions>
          </q-card>
        </q-dialog>
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import Menu from "../components/Menu.vue";

const app = useAppStore();
const auth = useUserStore();
const drawer = ref(false);
const open = ref(true);

onMounted(() => {
  if ((auth.user && auth.user, auth.allow_push)) {
    enableNotifications();
  }
});

const showAskBanner = computed(
  () =>
    "Notification" in window && auth.user && auth.user.ask_push && open.value
);
const disableNotification = () => {
  auth.user.ask_push = false;
  auth.user.allow_push = false;
  auth.updateUser();
};
const askLater = () => {
  open.value = false;
  auth.user.ask_push = true;
  auth.allow_push = false;
  auth.updateUser();
};
const enableNotifications = () => {
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      auth.user.ask_push = false;
      auth.fetchFCMToken();
    } else {
      auth.user.ask_push = true;
      auth.allow_push = false;
      auth.updateUser();
    }
  });
};
</script>
