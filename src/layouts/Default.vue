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
        <History-Button v-else />

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
      <Ask-Permission v-if="auth.showConsent" />
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, defineAsyncComponent } from "vue";
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import HistoryButton from "../components/History-Button.vue";
import Menu from "../components/Menu.vue";

const AskPermission = defineAsyncComponent(() =>
  import("../components/Ask-Permission.vue")
);

const app = useAppStore();
const auth = useUserStore();
const drawer = ref(false);
</script>
