<template>
  <q-toolbar-title>
    <router-link to="/" style="color: inherit; text-decoration: none">{{
      $route.meta.title
    }}</router-link>
  </q-toolbar-title>

  <HistoryButton />
</template>

<script setup lang="ts">
import HistoryButton from 'src/components/History-Button.vue'
</script>
