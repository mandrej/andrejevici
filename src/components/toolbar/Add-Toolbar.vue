<template>
  <q-toolbar-title>
    <router-link to="/" style="color: inherit; text-decoration: none">{{
      $route.meta.title
    }}</router-link>
  </q-toolbar-title>

  <div class="row absolute-bottom">
    <LinearProgress />
  </div>
</template>

<script setup lang="ts">
import LinearProgress from 'src/components/toolbar/Linear-Progress.vue'
</script>
