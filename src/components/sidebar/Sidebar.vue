<template>
  <Menu />
  <q-space />
  <ManageSelection v-if="route.name === 'list'" />
  <SendMessage v-if="route.name === 'admin' || route.name === 'add'" class="q-my-md" />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import Menu from './Menu.vue'
import ManageSelection from './ManageSelection.vue'
import SendMessage from './SendMessage.vue'

const route = useRoute()
</script>
