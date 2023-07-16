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
          {{ crudStore.counter.more ? "+" : "" }}{{ crudStore.counter.count }}
        </div>
        <q-btn
          v-else
          flat
          round
          icon="history"
          :to="{ name: 'list', query: crudStore.find }"
        />
        <q-linear-progress
          v-show="crudStore.busy"
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
import { useCrudStore } from "../stores/crud";
import Menu from "../components/Menu.vue";

const crudStore = useCrudStore();
const drawer = ref(false);
</script>
