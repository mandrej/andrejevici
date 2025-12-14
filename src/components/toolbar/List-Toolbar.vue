<template>
  <q-toolbar-title>
    <router-link to="/" style="color: inherit; text-decoration: none">{{
      $route.meta.title
    }}</router-link>
  </q-toolbar-title>

  <q-btn v-if="user && user.isAuthorized" flat stretch @click="changeMode(editMode)">{{
    editMode ? 'Edit mode' : 'View mode'
  }}</q-btn>
  <span class="q-mx-md">{{ record.count }}</span>

  <div class="absolute-bottom">
    <LinearProgress />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'
import LinearProgress from './Linear-Progress.vue'

const app = useAppStore()
const auth = useUserStore()
const { record, editMode } = storeToRefs(app)
const { user } = storeToRefs(auth)

const changeMode = (mode: boolean) => {
  mode = !mode
  editMode.value = mode
}
</script>
