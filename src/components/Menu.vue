<template>
  <q-list dark>
    <q-item clickable @click="auth.signIn">
      <q-item-section class="q-pl-md" avatar>
        <q-icon name="person" />
      </q-item-section>

      <q-item-section class="q-pr-md" v-if="user && user.name">
        <q-item-label>Sign out</q-item-label>
        <q-item-label caption>{{ user.name }}</q-item-label>
      </q-item-section>
      <q-item-section class="q-pr-md" v-else>
        <q-item-label>Sign in</q-item-label>
        <q-item-label caption>using your Google account</q-item-label>
      </q-item-section>
    </q-item>

    <q-item
      clickable
      v-ripple
      v-show="user && user.isAuthorized"
      to="/add"
      :active="$route.name === 'add'"
    >
      <q-item-section class="q-pl-md" avatar>
        <q-icon name="add_circle" />
      </q-item-section>

      <q-item-section class="q-pr-md">
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
      <q-item-section class="q-pl-md" avatar>
        <q-icon name="settings" />
      </q-item-section>

      <q-item-section class="q-pr-md">
        <q-item-label>Admin</q-item-label>
        <q-item-label caption>rebuild, repair, tags, subscribers</q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '../stores/user'

const auth = useUserStore()
const { user } = storeToRefs(auth)
</script>
