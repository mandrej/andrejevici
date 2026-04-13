<template>
  <q-list class="q-mt-lg">
    <q-item clickable v-ripple to="/" :active="$route.name === 'home'">
      <q-item-section avatar>
        <q-icon name="sym_r_home" />
      </q-item-section>

      <q-item-section>
        <q-item-label>Start</q-item-label>
        <q-item-label caption></q-item-label>
      </q-item-section>
    </q-item>

    <q-item clickable v-ripple to="/list" :active="$route.name === 'list'">
      <q-item-section avatar>
        <q-icon name="sym_r_grid_view" />
      </q-item-section>

      <q-item-section>
        <q-item-label>Browse</q-item-label>
        <q-item-label caption>You can filter results</q-item-label>
      </q-item-section>
    </q-item>

    <q-item
      clickable
      v-ripple
      v-show="user && user.isAuthorized && user.nick"
      to="/add"
      :active="$route.name === 'add'"
    >
      <q-item-section avatar>
        <q-icon name="sym_r_add_a_photo" />
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
        <q-icon name="sym_r_settings" />
      </q-item-section>

      <q-item-section>
        <q-item-label>Admin</q-item-label>
        <q-item-label caption>rebuild, repair, tags, subscribers</q-item-label>
      </q-item-section>
    </q-item>

    <q-item clickable v-ripple @click="auth.signIn">
      <q-item-section avatar>
        <q-icon :name="user && user.isAuthorized ? 'sym_r_logout' : 'sym_r_login'" />
      </q-item-section>

      <q-item-section>
        <q-item-label>{{ user ? `Sign out ${user.name}` : 'Sign in' }}</q-item-label>
        <q-item-label caption>
          {{ user ? contribution(user!.email) : 'Sign in with your Google account' }}
        </q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '../../stores/user'
import { useValuesStore } from '../../stores/values'

const auth = useUserStore()
const { user } = storeToRefs(auth)
const values = useValuesStore()

const contribution = (email: string) => {
  const c = values.values.email[email]
  return c ? `Thanks for your ${c} photos` : 'Thanks for your photos'
}
</script>
