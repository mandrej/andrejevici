<template>
  <q-layout view="hHh Lpr lFf">
    <q-header class="fixed-top" elevated>
      <q-toolbar class="bg-white text-dark">
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

        <template v-if="$route.name === 'list'">
          <q-btn
            v-if="auth.user && auth.user.isAuthorized"
            flat
            stretch
            @click="app.editMode = !app.editMode"
            >{{ editMode ? "Edit mode" : "View mode" }}</q-btn
          >
          <span v-if="$route.name === 'list'" class="q-mx-md">
            {{ app.record.count }}
          </span>
        </template>

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
      elevated
      dark
    >
      <keep-alive>
        <router-view name="sidebar" />
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
import { ref, computed, defineAsyncComponent } from "vue";
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
const editMode = computed(() => app.editMode);
</script>
