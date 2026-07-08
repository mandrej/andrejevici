<template>
  <nav class="mt-2 px-2 space-y-1">
    <MenuLink to="/" icon="sym_r_home" title="Start" active-route-name="home" />

    <MenuLink
      to="/list"
      icon="sym_r_grid_view"
      title="Browse"
      subtitle="You can filter results"
      active-route-name="list"
    />

    <MenuLink
      v-show="user && user.isAuthorized && user.nick"
      to="/add"
      icon="sym_r_add_a_photo"
      title="Add"
      subtitle="jpeg images less then 5 Mb"
      active-route-name="add"
    />

    <MenuLink
      v-show="user && user.isAdmin"
      to="/admin"
      icon="sym_r_settings"
      title="Admin"
      subtitle="rebuild, repair, tags, subscribers"
      active-route-name="admin"
    />
  </nav>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '../../stores/user'
import MenuLink from './MenuLink.vue'

const auth = useUserStore()
const { user } = storeToRefs(auth)
</script>
