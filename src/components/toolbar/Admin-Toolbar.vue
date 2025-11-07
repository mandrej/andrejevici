<template>
  <q-toolbar-title>
    <router-link to="/" v-if="$q.screen.gt.xs" style="color: inherit; text-decoration: none">{{
      $route.meta.title
    }}</router-link>
  </q-toolbar-title>

  <q-space />
  <q-tabs v-model="adminTab" shrink>
    <q-tab name="repair" label="Repair" />
    <q-tab name="tags" label="Tags" />
    <!-- <q-tab name="camera" label="Camera" /> -->
    <q-tab name="users" label="Users" />
    <q-tab name="messages" label="Messages" />
  </q-tabs>

  <div class="row absolute-bottom">
    <LinearProgress />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import LinearProgress from 'src/components/Linear-Progress.vue'

const app = useAppStore()
const { adminTab } = storeToRefs(app)
</script>
