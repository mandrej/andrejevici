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

        <div v-if="$route.name === 'list'">
          {{ app.counter.more ? "+" : "" }}{{ app.counter.count }}
        </div>
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
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from "vue";
import { useAppStore } from "../stores/app";
import Menu from "../components/Menu.vue";

const app = useAppStore();
const drawer = ref(false);
</script>
