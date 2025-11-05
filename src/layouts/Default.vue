<template>
  <q-layout view="hHh Lpr lFf">
    <q-header class="fixed-top">
      <q-toolbar>
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
        <template v-if="$route.name === 'admin'">
          <div v-if="$q.screen.xs">
            <q-tabs v-model="adminTab" inline-label>
              <q-btn-dropdown
                v-if="$q.screen.xs"
                auto-close
                stretch
                flat
                icon="more"
                label="More&#x2026;"
              >
                <q-list>
                  <q-item clickable @click="adminTab = 'repair'">
                    <q-item-section>Repair</q-item-section>
                  </q-item>
                  <q-item clickable @click="adminTab = 'tags'">
                    <q-item-section>Tags</q-item-section>
                  </q-item>
                  <q-item clickable @click="adminTab = 'users'">
                    <q-item-section>Users</q-item-section>
                  </q-item>
                  <q-item clickable @click="adminTab = 'messages'">
                    <q-item-section>Messages</q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </q-tabs>
          </div>
          <div v-else>
            <q-tabs v-model="adminTab" inline-label>
              <q-tab name="repair" label="Repair" />
              <q-tab name="tags" label="Tags" />
              <!-- <q-tab name="camera" label="Camera" /> -->
              <q-tab name="users" label="Users" />
              <q-tab name="messages" label="Messages" />
            </q-tabs>
          </div>
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
