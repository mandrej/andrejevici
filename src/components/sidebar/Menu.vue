<template>
  <nav class="mt-6 px-2 space-y-1">
    <router-link
      to="/"
      :class="[
        'flex items-center p-3 rounded-lg transition-colors duration-200',
        $route.name === 'home' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
      ]"
    >
      <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3">
        <span class="material-symbols-rounded text-2xl">sym_r_home</span>
      </div>
      <div class="flex flex-col">
        <span class="font-medium text-sm">Start</span>
        <span class="text-xs text-gray-500"></span>
      </div>
    </router-link>

    <router-link
      to="/list"
      :class="[
        'flex items-center p-3 rounded-lg transition-colors duration-200',
        $route.name === 'list' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
      ]"
    >
      <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3">
        <span class="material-symbols-rounded text-2xl">sym_r_grid_view</span>
      </div>
      <div class="flex flex-col">
        <span class="font-medium text-sm">Browse</span>
        <span class="text-xs text-gray-500">You can filter results</span>
      </div>
    </router-link>

    <router-link
      v-show="user && user.isAuthorized && user.nick"
      to="/add"
      :class="[
        'flex items-center p-3 rounded-lg transition-colors duration-200',
        $route.name === 'add' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
      ]"
    >
      <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3">
        <span class="material-symbols-rounded text-2xl">sym_r_add_a_photo</span>
      </div>
      <div class="flex flex-col">
        <span class="font-medium text-sm">Add</span>
        <span class="text-xs text-gray-500">jpeg images less then 4 Mb</span>
      </div>
    </router-link>

    <router-link
      v-show="user && user.isAdmin"
      to="/admin"
      :class="[
        'flex items-center p-3 rounded-lg transition-colors duration-200',
        $route.name === 'admin' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
      ]"
    >
      <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3">
        <span class="material-symbols-rounded text-2xl">sym_r_settings</span>
      </div>
      <div class="flex flex-col">
        <span class="font-medium text-sm">Admin</span>
        <span class="text-xs text-gray-500">rebuild, repair, tags, subscribers</span>
      </div>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '../../stores/user'

const auth = useUserStore()
const { user } = storeToRefs(auth)
</script>
