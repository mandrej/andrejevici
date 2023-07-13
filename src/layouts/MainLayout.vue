<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" />

        <router-link to="/x" style="color: inherit; text-decoration: none">
          <q-toolbar-title>{{ CONFIG.title }}</q-toolbar-title>
        </router-link>
        <q-space />
        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import CONFIG from "../../config.json";
</script>
