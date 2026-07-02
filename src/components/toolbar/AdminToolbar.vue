<template>
  <!-- Title -->
  <div class="flex-1 flex items-center gap-2 min-w-0">
    <router-link
      v-if="screen.gtXs"
      to="/"
      class="text-base font-semibold whitespace-nowrap link hover:opacity-80 transition-opacity"
    >
      {{ $route.meta.title }}
    </router-link>
  </div>

  <!-- Indeterminate progress bar at header bottom -->
  <Teleport to="body">
    <div v-if="busy" class="fixed top-14 left-0 right-0 z-30 h-0.5 overflow-hidden">
      <AppProgress indeterminate color="warning" :height="2" />
    </div>
  </Teleport>

  <!-- Admin tab switcher -->
  <div class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 ml-2">
    <button
      v-for="tab in tabs"
      :key="tab.name"
      :class="[
        'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
        adminTab === tab.name
          ? 'bg-primary text-white'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
      ]"
      :title="tab.label"
      @click="adminTab = tab.name"
    >
      <span class="material-symbols-rounded text-base leading-none">{{ tab.icon }}</span>
      <span v-if="screen.gtXs" class="hidden sm:inline">{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useScreen } from '../../composables/useScreen'
import AppProgress from '../atoms/AppProgress.vue'

const app = useAppStore()
const { busy, adminTab } = storeToRefs(app)
const screen = useScreen()

const tabs = [
  { name: 'repair', icon: 'construction', label: 'Repair' },
  { name: 'meta', icon: 'schema', label: 'Metadata' },
  { name: 'users', icon: 'group', label: 'Users' },
  { name: 'messages', icon: 'chat', label: 'Messages' },
] as const
</script>
