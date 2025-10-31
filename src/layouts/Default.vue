<template>
  <q-layout view="hHh Lpr lFf">
    <q-header class="fixed-top">
      <q-toolbar :class="$q.dark ? 'bd-dark' : 'bg-yellow'">
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawer = !drawer" />
        <q-toolbar-title>
          <router-link to="/" style="color: inherit; text-decoration: none">{{
            $route.meta.title
          }}</router-link>
        </q-toolbar-title>

        <template v-if="$route.name === 'list'">
          <q-btn v-if="user && user.isAuthorized" flat stretch @click="changeMode(editMode)">{{
            editMode ? 'Edit mode' : 'View mode'
          }}</q-btn>
          <span v-if="$route.name === 'list'" class="q-mx-md">
            {{ record.count }}
          </span>
        </template>
        <HistoryButton v-else />

        <div class="row absolute-bottom">
          <router-view name="progress" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" class="q-pb-sm column no-wrap" :width="320" show-if-above bordered>
      <router-view name="sidebar" />
      <q-space />
      <Menu />
    </q-drawer>

    <q-page-container>
      <Ask-Permission v-if="showConsent" />
      <template v-if="$route.name === 'admin'">
        <q-tabs v-model="adminTab" inline-label indicator-color="primary" align="right">
          <q-tab name="repair" label="Repair" />
          <q-tab name="tags" label="Tags" />
          <!-- <q-tab name="camera" label="Camera" /> -->
          <q-tab name="users" label="Users" />
          <q-tab name="messages" label="Messages" />
        </q-tabs>
      </template>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import Menu from '../components/Menu.vue'
import HistoryButton from '../components/History-Button.vue'

const AskPermission = defineAsyncComponent(() => import('../components/Ask-Permission.vue'))

const app = useAppStore()
const auth = useUserStore()
const drawer = ref(false)
const { record, editMode, adminTab } = storeToRefs(app)
const { user, askPush } = storeToRefs(auth)

const showConsent = computed(() => {
  return Boolean('Notification' in window && askPush.value)
})

const changeMode = (mode: boolean) => {
  mode = !mode
  editMode.value = mode
}
</script>
