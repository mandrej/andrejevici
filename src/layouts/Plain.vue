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
        </router-link>
        <q-btn
          v-if="user && user.isAuthorized"
          unelevated
          rounded
          class="absolute-bottomtop-left q-ma-md bg-warning text-dark"
          :label="`Sign out ${user.name}`"
          @click="auth.signIn"
        />
        <q-btn
          v-else
          round
          icon="person"
          class="absolute-top-left q-ma-md bg-warning text-dark"
          @click="auth.signIn"
        />

        <div class="column col-xs-12 col-md-6 justify-center items-center" style="min-height: 50vh">
          <router-view />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'
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
