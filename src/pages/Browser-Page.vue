<template>
  <Edit-Record v-if="showEdit" :rec="currentEdit" @edit-ok="editOk" />
  <Confirm-Delete v-if="showConfirm" :rec="select2delete" @confirm-ok="confirmOk" />

  <component
    :is="currentView"
    :objects="objects"
    @carousel-show="carouselShow"
    @carousel-cancel="carouselCancel"
    @edit-record="editRecord"
    @confirm-delete="confirmShow"
    @edit-ok="editOk"
  ></component>
</template>

<script setup>
import { scroll } from 'quasar'
import { ref, shallowRef, onMounted, nextTick, defineAsyncComponent, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useRoute } from 'vue-router'
import { fakeHistory, reFilename, removeHash } from '../helpers'

import SwiperView from '../components/Swiper-View.vue'
import ListView from '../components/List-View.vue'

const EditRecord = defineAsyncComponent(() => import('../components/Edit-Record.vue'))
const ConfirmDelete = defineAsyncComponent(() => import('../components/Confirm-Delete.vue'))

const app = useAppStore()
const route = useRoute()
const select2delete = ref({})
const { getScrollTarget, setVerticalScrollPosition } = scroll

const { objects, showCarousel, markerFileName, showConfirm, showEdit, currentEdit } =
  storeToRefs(app)
const currentView = shallowRef(ListView)

onMounted(() => {
  const hash = route.hash
  if (hash) {
    const filename = hash.substring(2)
    currentView.value = SwiperView
    markerFileName.value = filename
  }
})

watchEffect(() => {
  currentView.value = showCarousel.value ? SwiperView : ListView
})

const confirmShow = (rec) => {
  select2delete.value = rec
  fakeHistory()
  showConfirm.value = true
}
const confirmOk = (rec) => {
  showConfirm.value = false
  app.deleteRecord(rec)
}

const editRecord = (rec) => {
  currentEdit.value = rec
  fakeHistory()
  showEdit.value = true
}
const editOk = (hash) => {
  const el = document.querySelector('#' + hash)
  if (!el) return
  el.classList.add('bounce')
  setTimeout(() => {
    el.classList.remove('bounce')
  }, 2000)
}

const carouselShow = (filename) => {
  markerFileName.value = filename
  fakeHistory()
  nextTick(() => {
    showCarousel.value = true
  })
}

const carouselCancel = (hash) => {
  const [, id] = hash.match(reFilename)
  nextTick(() => {
    const el = document.getElementById(id)
    if (!el) return
    const target = getScrollTarget(el)
    setVerticalScrollPosition(target, el.offsetTop, 400)
    removeHash()
  })
}
</script>
