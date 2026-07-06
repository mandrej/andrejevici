<template>
  <div class="flex flex-col h-full mt-4">
    <Menu />
    <div class="flex-grow"></div>
    <ManageSelection v-if="route.name === 'list'" />
    <SendMessage v-if="route.name === 'admin' || route.name === 'add'" class="my-4" />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import Menu from './Menu.vue'
import ManageSelection from './ManageSelection.vue'
import SendMessage from './SendMessage.vue'

const route = useRoute()
</script>
