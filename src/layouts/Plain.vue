<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="row">
        <div
          v-if="isEmpty(nickValues)"
          class="column justify-center items-center col-xs-12 col-md-6 relative-position"
          :style="{ minHeight: $q.screen.gt.sm ? '100vh' : '50vh' }"
        >
          <div class="text-center q-px-xl">
            There are no photos posted yet...<br />
            To add some you need to sign-in with your Google account. Only authorized users with a
            defined nickname can add, delete or edit photos.
            <div class="q-my-md">
              <q-btn
                color="primary"
                :label="user && user.isAuthorized && user.nick ? 'Sign out' : 'Sign in'"
                @click="auth.signIn()"
              />
              <q-btn
                class="q-ml-md"
                v-if="user?.isAuthorized && user?.nick"
                to="/add"
                color="primary"
                label="Add photos"
              />
            </div>
          </div>
        </div>

        <div v-else class="column col-xs-12 col-md-6 relative-position">
          <router-link
            :style="{ ...imageStyle(lastRecord), height: '100%' }"
            :to="{ path: '/list' }"
            v-ripple.early="{ color: 'purple' }"
          />
          <q-btn
            v-if="user?.isAuthorized && user?.nick"
            to="/add"
            icon="sym_r_add_a_photo"
            size="lg"
            round
            unelevated
            color="warning"
            text-color="black"
            :class="['q-ma-md', $q.screen.gt.sm ? 'absolute-bottom-left' : 'absolute-bottom-right']"
          />
        </div>
        <div
          class="column col-xs-12 col-md-6 justify-center items-center"
          :style="{ minHeight: $q.screen.gt.sm ? '100vh' : '50vh' }"
        >
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
import { useValuesStore } from '../stores/values'
import { isEmpty } from '../helpers'
import type { PhotoType } from '../helpers/models'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const { user } = storeToRefs(auth)
const lastRecord = computed(() => app.lastRecord as PhotoType)
const nickValues = computed(() => meta.nickValues)

const common = {
  display: 'block',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  transition: 'background-image 0.2s ease-in-out',
  minHeight: '50vh',
}
const imageStyle = (rec: PhotoType) => {
  if (rec && rec.thumb) {
    return { ...common, backgroundImage: `url(${rec.url}), url(${rec.thumb})` }
  }
}
</script>
