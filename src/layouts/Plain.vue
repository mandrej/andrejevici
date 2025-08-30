<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="row">
        <router-link
          class="col-xs-12 col-md-6"
          :style="imageStyle(lastRecord)"
          :to="{ path: '/list' }"
          v-ripple.early="{ color: 'purple' }"
        >
          <q-btn
            v-if="user && user.isAuthorized"
            fab
            icon="add"
            color="warning"
            text-color="dark"
            class="absolute-top-left q-ma-md bg-warning text-dark"
            to="/add"
          />
          <q-btn
            v-else
            fab
            icon="person"
            class="absolute-top-left q-ma-md bg-warning text-dark"
            @click="auth.signIn"
          />
        </router-link>

        <div class="column col-xs-12 col-md-6 q-pa-md justify-center">
          <router-view />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import type { LastPhoto } from 'src/helpers/models'

const app = useAppStore()
const auth = useUserStore()
const { user } = storeToRefs(auth)
const lastRecord = computed(() => app.lastRecord as LastPhoto)

const common = {
  display: 'block',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  transition: 'background-image 0.2s ease-in-out',
  minHeight: '50vh',
}
const imageStyle = (rec: LastPhoto) => {
  if (rec && rec.thumb) {
    return { ...common, backgroundImage: `url(${rec.url}), url(${rec.thumb})` }
  } else {
    return { ...common, backgroundImage: `url(camera.svg)`, backgroundSize: '65%' }
  }
}
</script>
