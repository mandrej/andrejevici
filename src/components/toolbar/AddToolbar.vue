<template>
  <!-- Title -->
  <div class="flex-1 flex items-center gap-2 min-w-0">
    <router-link to="/" class="text-base font-semibold whitespace-nowrap link hover:opacity-80 transition-opacity">
      {{ $route.meta.title }}
    </router-link>
  </div>

  <!-- Per-file upload progress bars -->
  <Teleport to="body">
    <div
      v-if="progressInfo && Object.keys(progressInfo).length > 0"
      class="fixed top-14 left-0 right-0 z-30 flex overflow-hidden"
    >
      <div
        v-for="(value, name) in progressInfo"
        :key="name"
        :style="{ width: (100 / Object.keys(progressInfo).length) + '%' }"
        class="h-0.5 overflow-hidden bg-gray-200 dark:bg-gray-700"
      >
        <AppProgress :value="value" color="warning" :height="2" />
      </div>
    </div>
  </Teleport>

  <!-- Tab switcher -->
  <div class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 ml-2">
    <button
      v-for="tab in tabs"
      :key="tab.name"
      :class="[
        'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
        addTab === tab.name
          ? 'bg-primary text-white'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
      ]"
      @click="addTab = tab.name"
    >
      <span class="material-symbols-rounded text-base leading-none">{{ tab.icon }}</span>
      <span class="hidden sm:inline">{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import AppProgress from '../atoms/AppProgress.vue'

const app = useAppStore()
const { progressInfo, addTab } = storeToRefs(app)

const tabs = [
  { name: 'photo', icon: 'image', label: 'Images' },
  { name: 'video', icon: 'video_library', label: 'Videos' },
] as const
</script>
