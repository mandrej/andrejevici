<template>
  <!-- flex-1 stretches to fill header -->
  <div class="flex-1 flex items-center gap-2 min-w-0">
    <router-link
      v-if="screen.gtXs"
      to="/"
      class="text-base font-semibold whitespace-nowrap link hover:opacity-80 transition-opacity"
    >
      {{ $route.meta.title }}
    </router-link>
    <GlobalSearch class="flex-1 min-w-0" />
  </div>

  <!-- Indeterminate progress bar at bottom of header -->
  <Teleport to="body">
    <div
      v-if="busy"
      class="fixed top-14 left-0 right-0 z-30 h-0.5 overflow-hidden"
    >
      <AppProgress indeterminate color="warning" :height="2" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useScreen } from '../../composables/useScreen'
import GlobalSearch from '../GlobalSearch.vue'
import AppProgress from '../atoms/AppProgress.vue'

const app = useAppStore()
const { busy } = storeToRefs(app)
const screen = useScreen()
</script>
