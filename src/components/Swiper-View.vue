<template>
  <q-dialog v-model="showCarousel" :maximized="true" persistent>
    <q-card>
      <swiper-container
        :keyboard="{
          enabled: true,
        }"
        :grab-cursor="true"
        :zoom="{
          maxRatio: 2,
        }"
        :lazy="true"
        @swiperinit="onSwiper"
        @swiperslidechange="onSlideChange"
      >
        <swiper-slide v-for="obj in objects" :key="obj.filename" :data-hash="U + obj.filename">
          <div
            v-show="!full"
            class="absolute-top row no-wrap justify-between"
            style="z-index: 3000; background-color: rgba(0, 0, 0, 0.5)"
          >
            <q-btn
              v-if="user && user.isAdmin"
              flat
              round
              class="text-white q-pa-sm"
              icon="delete"
              @click="emit('confirm-delete', obj)"
            />
            <div
              v-show="!full"
              v-html="caption(obj)"
              class="col q-my-sm text-white text-center ellipsis"
            ></div>

            <q-btn
              flat
              round
              class="text-white q-pa-sm"
              icon="close"
              @click="onCancel(U + obj.filename)"
            />
          </div>
          <div class="swiper-zoom-container">
            <img :src="obj.url" loading="lazy" @load="onLoad" @error="onError" />
            <div class="swiper-lazy-preloader" />
          </div>
          <q-btn
            flat
            round
            class="absolute-bottom-left text-white q-pa-sm"
            @click="onShare()"
            icon="share"
          />
          <q-btn
            flat
            round
            class="absolute-bottom-right text-white q-pa-sm"
            @click="$q.fullscreen.toggle()"
            :icon="full ? 'fullscreen_exit' : 'fullscreen'"
          />
        </swiper-slide>
      </swiper-container>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useQuasar, copyToClipboard } from 'quasar'
import { storeToRefs } from 'pinia'
import { ref, watchEffect } from 'vue'
import { useAppStore } from '../stores/app'
import { useUserStore } from 'src/stores/user'
import { useRoute } from 'vue-router'
import { fileBroken, U } from '../helpers'
import { register } from 'swiper/element/bundle'
import { Keyboard, Zoom } from 'swiper/modules'
import notify from '../helpers/notify'
import type { Swiper } from 'swiper/types'
import type { PhotoType } from '../helpers/models'

import 'swiper/scss'
import 'swiper/scss/zoom'

const props = defineProps<{
  index: number
}>()
const emit = defineEmits(['confirm-delete', 'carousel-cancel'])

const $q = useQuasar()
const app = useAppStore()
const auth = useUserStore()
const route = useRoute()
const { objects, showCarousel } = storeToRefs(app)
const { user } = storeToRefs(auth)
const hash = ref<string | null>(null)
const urlHash = new RegExp(/#(.*)?/) // matching string hash
const full = ref(false)

register()
let swiper: Swiper | null = null

const onSwiper = (e: { detail: Swiper[] }): void => {
  swiper = e.detail[0] ?? null // instance
  if (swiper) {
    Object.assign(swiper, { modules: [Keyboard, Zoom] })
    swiper.slideTo(props.index, 0)
    onSlideChange()
  }
}
const onSlideChange = () => {
  let url = route.fullPath
  const slide = swiper!.slides[swiper!.activeIndex]
  if (slide) {
    hash.value = slide.dataset.hash || null
    const sufix = '#' + hash.value
    if (urlHash.test(url)) {
      url = url.replace(urlHash, sufix)
    } else {
      url += sufix
    }
    window.history.replaceState(history.state, '', url)
  }
}

const onLoad = (e: Event): void => {
  const target = e.target as HTMLImageElement
  // calculate image dimension
  const dim1: [number, number] = [target.width, target.height]
  const dim0: [number, number] = [target.naturalWidth, target.naturalHeight]
  const wRatio = dim0[0] / dim1[0]
  const hRatio = dim0[1] / dim1[1]

  const container = target.closest('.swiper-zoom-container') as HTMLElement
  container.dataset.swiperZoom = Math.max(wRatio, hRatio, 1).toString()
}
const onError = (e: Event) => {
  const target = e.target as HTMLImageElement | null
  if (target) {
    target.src = fileBroken
  }
}
const caption = (rec: PhotoType) => {
  let tmp = ''
  const { headline, aperture, shutter, iso, model, lens } = rec
  tmp += headline + '<br/>'
  tmp += aperture ? ' f' + aperture : ''
  tmp += shutter ? ' ' + shutter + 's' : ''
  tmp += iso ? ' ' + iso + ' ASA' : ''
  if ($q.screen.gt.sm) {
    tmp += model ? ' ' + model : ''
    tmp += lens ? ' ' + lens : ''
  }
  return tmp
}

const onShare = () => {
  copyToClipboard(window.location.href)
    .then(() => {
      notify({ message: 'URL copied to clipboard' })
    })
    .catch(() => {
      notify({ type: 'warning', message: 'Unable to copy URL to clipboard' })
    })
}

window.onpopstate = function () {
  showCarousel.value = false
  emit('carousel-cancel', hash.value)
}
const onCancel = (hsh: string) => {
  showCarousel.value = false
  if (!hash.value) hash.value = hsh
  emit('carousel-cancel', hash.value)
}

watchEffect(() => (full.value = $q.fullscreen.isActive))
</script>

<style scoped>
swiper-container {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  position: absolute;
  z-index: 2000;
  border-radius: 0 !important;
  max-width: 100vw;
  max-height: 100vh;
}

swiper-slide {
  text-align: center;
  background: #000;
}
swiper-slide img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
}
</style>
