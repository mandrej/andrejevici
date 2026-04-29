<template>
  <q-toolbar-title class="row items-center no-wrap">
    <router-link to="/" class="text-h6 q-mr-sm" style="color: inherit; text-decoration: none">
      {{ $route.meta.title }}
    </router-link>
    <GlobalSearch />
  </q-toolbar-title>

  <div class="absolute-bottom">
    <q-linear-progress v-if="busy" color="warning" indeterminate />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import GlobalSearch from '../GlobalSearch.vue'

const app = useAppStore()
const { busy } = storeToRefs(app)
</script>
