<template>
  <q-dialog v-model="showCarousel" :maximized="true" persistent>
    <q-card flat>
      <swiper-container
        :keyboard="{
          enabled: true,
        }"
        :grab-cursor="true"
        :zoom="{
          maxRatio: 3,
          limitToOriginalSize: true,
        }"
        :lazy="true"
        @swiperinit="onSwiper"
      >
        <swiper-slide v-for="obj in objects" :key="obj.filename" :data-hash="U + obj.filename">
          <div
            v-show="!full"
            class="absolute-top row no-wrap justify-between"
            style="z-index: 3000; background-color: rgba(0, 0, 0, 0.5)"
          >
            <div
              v-html="getCaption(obj, $q.screen.gt.sm)"
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
            <img :src="obj.url" loading="lazy" @error="onError" />
            <div class="swiper-lazy-preloader" />
          </div>

          <div v-show="!full" class="absolute-bottom-right row no-wrap">
            <template v-if="isAuthorOrAdmin(user, obj, editMode)">
              <q-btn
                flat
                round
                class="text-white q-pa-sm"
                icon="delete"
                @click="emit('confirm-delete', obj)"
              />
              <q-btn
                flat
                round
                class="text-white q-pa-sm"
                icon="edit"
                @click="emit('edit-record', obj)"
              />
            </template>
            <q-btn flat round class="text-white q-pa-sm" @click="onShare()" icon="share" />
            <q-btn
              flat
              round
              class="text-white q-pa-sm"
              @click="$q.fullscreen.toggle()"
              :icon="full ? 'fullscreen_exit' : 'fullscreen'"
            />
          </div>
        </swiper-slide>
      </swiper-container>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useQuasar, copyToClipboard } from 'quasar'
import { storeToRefs } from 'pinia'
import { ref, watchEffect } from 'vue'
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'
import { fileBroken, U, isAuthorOrAdmin } from 'src/helpers'
import { register } from 'swiper/element/bundle'
import { Keyboard, Zoom } from 'swiper/modules'
import notify from 'src/helpers/notify'
import type { Swiper } from 'swiper/types'
import type { PhotoType } from 'src/helpers/models'

import 'swiper/css'
import 'swiper/css/zoom'

const props = defineProps<{
  index: number
}>()
const emit = defineEmits(['confirm-delete', 'edit-record', 'carousel-cancel'])

const $q = useQuasar()
const app = useAppStore()
const auth = useUserStore()
const { objects, showCarousel, editMode } = storeToRefs(app)
const { user } = storeToRefs(auth)
const hash = ref<string | null>(null)
const full = ref(false)

register()
let swiper: Swiper | null = null

const onSwiper = (e: { detail: Swiper[] }): void => {
  swiper = e.detail[0] ?? null // instance
  if (swiper) {
    Object.assign(swiper, { modules: [Keyboard, Zoom] })
    swiper.slideTo(props.index, 0)
  }
}

// const onLoad = (e: Event): void => {
//   const target = e.target as HTMLImageElement
//   // calculate image dimension
//   const dim1: [number, number] = [target.width, target.height]
//   const dim0: [number, number] = [target.naturalWidth, target.naturalHeight]
//   const wRatio = dim0[0] / dim1[0]
//   const hRatio = dim0[1] / dim1[1]

//   const container = target.closest('.swiper-zoom-container') as HTMLElement
//   container.dataset.swiperZoom = Math.max(wRatio, hRatio, 1).toString()
// }

const onError = (e: Event) => {
  const target = e.target as HTMLImageElement | null
  if (target) {
    target.src = fileBroken
  }
}

const getCaption = (rec: PhotoType, showExtra: boolean): string => {
  let tmp = ''
  const { headline, aperture, shutter, iso, model, lens } = rec
  tmp += (headline || '') + '<br/>'
  tmp += aperture ? ' f' + aperture : ''
  tmp += shutter ? ' ' + shutter + 's' : ''
  tmp += iso ? ' ' + iso + ' ASA' : ''
  if (showExtra) {
    tmp += model ? ' ' + model : ''
    tmp += lens ? ' ' + lens : ''
  }
  return tmp
}

const onShare = () => {
  let url = window.location.href
  const urlHash = new RegExp(/#(.*)?/) // matching string hash
  const slide = swiper!.slides[swiper!.activeIndex]
  if (slide) {
    hash.value = slide.dataset.hash ?? null
    if (urlHash.test(url)) {
      url = url.replace(urlHash, hash.value ? '#' + hash.value : '')
    } else {
      url += hash.value ? '#' + hash.value : ''
    }

    copyToClipboard(url)
      .then(() => {
        notify({ message: 'URL copied to clipboard' })
      })
      .catch(() => {
        notify({ type: 'warning', message: 'Unable to copy URL to clipboard' })
      })
  }
}

window.onpopstate = function () {
  showCarousel.value = false
  emit('carousel-cancel', hash.value)
}
const onCancel = (hsh: string) => {
  showCarousel.value = false
  if (!hash.value) hash.value = hsh ?? null
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
