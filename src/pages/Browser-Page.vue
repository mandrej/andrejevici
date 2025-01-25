<template>
  <Edit-Record v-if="app.showEdit" :rec="app.currentEdit" @edit-ok="editOk" />
  <Confirm-Delete v-if="app.showConfirm" :rec="select2delete" @confirm-ok="confirmOk" />

  <Transition>
    <component
      :is="currentView"
      :objects="app.objects"
      @carousel-show="useCarouselShow"
      @carousel-cancel="useCarouselCancel"
      @edit-record="editRecord"
      @confirm-delete="confirmShow"
      @edit-ok="editOk"
    ></component>
  </Transition>
</template>

<script setup>
import { scroll } from 'quasar'
import { ref, shallowRef, onMounted, watch, nextTick, defineAsyncComponent } from 'vue'
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

const { showCarousel } = storeToRefs(app)
const currentView = shallowRef(ListView)

onMounted(() => {
  const hash = route.hash
  if (hash) {
    const filename = hash.substring(2)
    currentView.value = SwiperView
    app.markerFileName = filename
  }
})

watch(showCarousel, (show) => {
  if (show) {
    currentView.value = SwiperView
  } else {
    currentView.value = ListView
  }
})

const confirmShow = (rec) => {
  select2delete.value = rec
  fakeHistory()
  app.showConfirm = true
}
const confirmOk = (rec) => {
  app.showConfirm = false
  app.deleteRecord(rec)
}

const editRecord = (rec) => {
  app.currentEdit = rec
  fakeHistory()
  app.showEdit = true
}
const editOk = (hash) => {
  const el = document.querySelector('#' + hash)
  if (!el) return
  el.classList.add('bounce')
  setTimeout(() => {
    el.classList.remove('bounce')
  }, 2000)
}

const useCarouselShow = (filename) => {
  app.markerFileName = filename
  fakeHistory()
  nextTick(() => {
    app.showCarousel = true
  })
}

const useCarouselCancel = (hash) => {
  const [, id] = hash.match(reFilename)
  app.busy = true
  nextTick(() => {
    const el = document.getElementById(id)
    if (!el) return
    const target = getScrollTarget(el)
    setVerticalScrollPosition(target, el.offsetTop, 400)
    removeHash()
    app.busy = false
  })
}
</script>
