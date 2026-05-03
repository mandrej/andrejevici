<template>
  <q-toolbar-title>
    <router-link
      to="/"
      v-if="$q.screen.gt.xs"
      class="text-h6"
      style="color: inherit; text-decoration: none"
      >{{ $route.meta.title }}</router-link
    >
  </q-toolbar-title>

  <div class="row absolute-bottom">
    <q-linear-progress v-if="busy" color="warning" indeterminate />
  </div>

  <q-space />
  <q-tabs v-model="adminTab" shrink inline-label>
    <q-tab name="repair" icon="sym_r_construction" label="Repair" />
    <q-tab name="meta" icon="sym_r_schema" label="Metadata" />
    <q-tab name="users" icon="sym_r_group" label="Users" />
    <q-tab name="messages" icon="sym_r_chat" label="Messages" />
  </q-tabs>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'

const app = useAppStore()
const { busy, adminTab } = storeToRefs(app)
</script>
