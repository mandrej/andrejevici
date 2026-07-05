<template>
  <nav class="mt-2 px-2 space-y-1">
    <router-link
      to="/"
      :class="[
        'flex items-center p-3 rounded-lg transition-colors duration-200',
        $route.name === 'home'
          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
      ]"
    >
      <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3">
        <AppIcon name="sym_r_home" class="w-6 h-6" />
      </div>
      <div class="flex flex-col">
        <span class="font-medium text-sm">Start</span>
        <span class="text-xs"></span>
      </div>
    </router-link>

    <router-link
      to="/list"
      :class="[
        'flex items-center p-3 rounded-lg transition-colors duration-200',
        $route.name === 'list'
          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
      ]"
    >
      <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3">
        <AppIcon name="sym_r_grid_view" class="w-6 h-6" />
      </div>
      <div class="flex flex-col">
        <span class="font-medium text-sm">Browse</span>
        <span class="text-xs">You can filter results</span>
      </div>
    </router-link>

    <router-link
      v-show="user && user.isAuthorized && user.nick"
      to="/add"
      :class="[
        'flex items-center p-3 rounded-lg transition-colors duration-200',
        $route.name === 'add'
          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
      ]"
    >
      <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3">
        <AppIcon name="sym_r_add_a_photo" class="w-6 h-6" />
      </div>
      <div class="flex flex-col">
        <span class="font-medium text-sm">Add</span>
        <span class="text-xs">jpeg images less then 4 Mb</span>
      </div>
    </router-link>

    <router-link
      v-show="user && user.isAdmin"
      to="/admin"
      :class="[
        'flex items-center p-3 rounded-lg transition-colors duration-200',
        $route.name === 'admin'
          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
      ]"
    >
      <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3">
        <AppIcon name="sym_r_settings" class="w-6 h-6" />
      </div>
      <div class="flex flex-col">
        <span class="font-medium text-sm">Admin</span>
        <span class="text-xs">rebuild, repair, tags, subscribers</span>
      </div>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '../../stores/user'
import AppIcon from '../atoms/AppIcon.vue'

const auth = useUserStore()
const { user } = storeToRefs(auth)
</script>
