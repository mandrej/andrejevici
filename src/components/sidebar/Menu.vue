<template>
  <q-list>
    <q-item clickable v-ripple to="/" :active="$route.name === 'home'">
      <q-item-section avatar>
        <q-icon name="home" />
      </q-item-section>

      <q-item-section>
        <q-item-label>Start</q-item-label>
        <q-item-label caption></q-item-label>
      </q-item-section>
    </q-item>

    <q-item
      clickable
      v-ripple
      :to="{ name: 'list', query: { ...find } }"
      :active="$route.name === 'list'"
    >
      <q-item-section avatar>
        <q-icon name="grid_view" />
      </q-item-section>

      <q-item-section>
        <q-item-label>Browse</q-item-label>
        <q-item-label caption>You can filter results</q-item-label>
      </q-item-section>
    </q-item>

    <q-item
      clickable
      v-ripple
      v-show="user && user.isAuthorized"
      to="/add"
      :active="$route.name === 'add'"
    >
      <q-item-section avatar>
        <q-icon name="add_circle" />
      </q-item-section>

      <q-item-section>
        <q-item-label>Add</q-item-label>
        <q-item-label caption>jpeg images less then 4 Mb</q-item-label>
      </q-item-section>
    </q-item>

    <q-item
      clickable
      v-ripple
      v-show="user && user.isAdmin"
      to="/admin"
      :active="$route.name === 'admin'"
    >
      <q-item-section avatar>
        <q-icon name="settings" />
      </q-item-section>

      <q-item-section>
        <q-item-label>Admin</q-item-label>
        <q-item-label caption>rebuild, repair, tags, subscribers</q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'

const app = useAppStore()
const auth = useUserStore()
const { find } = storeToRefs(app)
const { user } = storeToRefs(auth)
</script>
