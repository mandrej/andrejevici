<template>
  <q-toolbar>
    <Global-Search />

    <div class="absolute-bottom">
      <q-linear-progress v-if="busy" color="warning" indeterminate />
    </div>
  </q-toolbar>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import GlobalSearch from 'src/components/Global-Search.vue'

const app = useAppStore()
const { busy } = storeToRefs(app)
</script>
