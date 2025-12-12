<template>
  <q-layout view="hHh Lpr lFf">
    <q-header class="fixed-top bg-grey-8">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawer = !drawer" />
        <router-view name="toolbar" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" class="q-pb-sm column no-wrap" :width="320" show-if-above>
      <router-view name="sidebar" />
    </q-drawer>

    <q-page-container>
      <q-page>
        <Ask-Permission />
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue'

const AskPermission = defineAsyncComponent(() => import('src/components/dialog/Ask-Permission.vue'))

const drawer = ref(false)
</script>
