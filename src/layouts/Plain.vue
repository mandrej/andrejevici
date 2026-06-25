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
            class="hero-link"
            :style="containerStyle"
            :to="{ path: '/list' }"
            v-ripple.early="{ color: 'purple' }"
          >
            <img
              v-if="heroUrls.main"
              :src="heroUrls.main"
              class="hero-image"
              fetchpriority="high"
              loading="eager"
              alt="Latest photo"
            />
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
import { isEmpty, getYouTubeMaxResUrl, getYouTubeId } from '../helpers'
import type { PhotoType } from '../helpers/models'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const { user } = storeToRefs(auth)
const lastRecord = computed(() => app.lastRecord as PhotoType)
const nickValues = computed(() => meta.nickValues)

const heroUrls = computed(() => {
  const rec = lastRecord.value
  if (!rec) return { main: '', thumb: '' }

  let thumb = rec.thumb || rec.url
  if (!rec.thumb && rec.kind === 'video') {
    const id = getYouTubeId(rec.url)
    if (id) thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`
  }

  const main = rec.kind === 'video' ? getYouTubeMaxResUrl(rec.url) : rec.url
  return { main, thumb }
})

const containerStyle = computed(() => {
  const urls = heroUrls.value
  if (!urls.thumb) return {}
  return {
    backgroundImage: `url(${urls.thumb})`,
  }
})
</script>

<style scoped>
.hero-link {
  display: block;
  height: 100%;
  min-height: 50vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  overflow: hidden;
}
.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
