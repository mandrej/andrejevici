<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="row">
        <div
          v-if="isEmpty(nickValues)"
          class="column justify-center items-center col-xs-12 col-md-6 relative-position"
          :style="{ minHeight: $q.screen.gt.sm ? '100vh' : '50vh' }"
        >
          <div class="text-center" style="max-width: 65%">
            There are no photos posted yet...<br />
            To add some you need to sign-in with your Google account. Only authorized users can add,
            delete or edit photos.
            <div class="q-my-md">
              <q-btn
                class="q-ml-md"
                v-if="user?.isAuthorized && user?.nick"
                to="/add"
                color="primary"
                rounded
                label="Add photos / videos"
              />
            </div>
          </div>
        </div>

        <div v-else class="column col-xs-12 col-md-6 relative-position">
          <router-link
            class="half-container"
            :to="{ path: '/list' }"
            v-ripple.early="{ color: 'purple' }"
          >
            <div
              class="lastrec-image"
              :style="showUrl ? { backgroundImage: `url(${showUrl})` } : {}"
            ></div>
            <div class="logo-overlay"></div>
          </router-link>
          <q-btn
            v-if="user?.isAuthorized && user?.nick"
            to="/add"
            icon="sym_r_add"
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
import { isEmpty, getYouTubeMaxResUrl } from '../helpers'
import type { PhotoType } from '../helpers/models'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const { user } = storeToRefs(auth)
const lastRecord = computed(() => app.lastRecord as PhotoType)
const nickValues = computed(() => meta.nickValues)

const showUrl = computed(() => {
  const rec = lastRecord.value
  if (!rec) return ''
  return rec.kind === 'video' ? getYouTubeMaxResUrl(rec.url) : rec.url
})
</script>

<style scoped>
.half-container {
  position: relative;
  height: 100%;
  overflow: hidden;
  min-height: 50vh;
}

.lastrec-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.logo-overlay {
  position: absolute;
  inset: 0;
  background: url('logo.svg') center / contain no-repeat;
  opacity: 0.5;
}
</style>
