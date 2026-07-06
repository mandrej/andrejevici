<template>
  <router-link
    :to="to"
    :class="[
      'flex items-center py-2 rounded-lg transition-colors duration-200',
      $route.name === activeRouteName
        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
    ]"
  >
    <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center mx-1">
      <AppIcon :name="icon" class="w-6 h-6" />
    </div>
    <div class="flex flex-col">
      <span class="font-medium text-sm">{{ title }}</span>
      <span v-if="subtitle" class="text-xs">{{ subtitle }}</span>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import AppIcon from '../atoms/AppIcon.vue'

defineProps<{
  to: string
  icon: string
  title: string
  subtitle?: string
  activeRouteName: string
}>()
</script>
