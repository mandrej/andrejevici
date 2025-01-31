<template>
  <Edit-Record v-if="showEdit" :rec="currentEdit" @edit-ok="editOk" />
  <Confirm-Delete v-if="showConfirm" :rec="select2delete" @confirm-ok="confirmOk" />
  <Swiper-View
    v-if="showCarousel"
    @confirm-delete="confirmShow"
    @carousel-cancel="carouselCancel"
  />

  <q-page>
    <q-banner
      v-if="error && error === 'empty'"
      class="fixed-center text-center bg-warning q-pa-md"
      style="z-index: 100"
      rounded
    >
      <q-icon name="error_outline" size="4em" />
      <div class="text-h6">No data found</div>
      <div>for current filter/ search</div>
    </q-banner>
    <q-banner
      v-else-if="error && error !== 'empty'"
      class="fixed-center text-center bg-warning q-pa-md"
      style="z-index: 100"
      rounded
    >
      <q-icon name="error_outline" size="4em" />
      <div class="text-h6">Something went wrong ...</div>
      <div>{{ error }}</div>
    </q-banner>

    <div class="q-pa-md">
      <div v-for="(list, index) in groupObjects" :key="index" class="q-mb-md">
        <q-infinite-scroll @load="onLoad" :offset="250">
          <transition-group tag="div" class="row q-col-gutter-md" name="fade">
            <div
              v-for="item in list"
              :key="item.filename"
              class="col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2"
            >
              <Picture-Card
                :rec="item"
                :canManage="isAuthorOrAdmin(item)"
                :canMergeTags="tagsToApplyExist()"
                @carousel-show="carouselShow(item.filename)"
                @carouselCancel="carouselCancel"
                @edit-record="editRecord"
                @merge-tags="mergeTags(item)"
                @confirm-delete="confirmShow(item)"
                @delete-record="app.deleteRecord"
              />
            </div>
          </transition-group>
          <!-- <template v-slot:loading>
            <div class="row justify-center q-my-md">
              <q-spinner-dots color="primary" size="40px" />
            </div>
          </template> -->
        </q-infinite-scroll>
      </div>
    </div>

    <q-page-scroller position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
      <q-btn fab icon="arrow_upward" color="warning" />
    </q-page-scroller>
  </q-page>
</template>

<script setup>
import { scroll, throttle } from 'quasar'
import { ref, computed, onMounted, nextTick, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useValuesStore } from '../stores/values'
import { useRoute } from 'vue-router'
import { CONFIG, U, fakeHistory, reFilename, removeHash } from '../helpers'

import PictureCard from '../components/Picture-Card.vue'
import SwiperView from './Swiper-View.vue'
const EditRecord = defineAsyncComponent(() => import('../components/Edit-Record.vue'))
const ConfirmDelete = defineAsyncComponent(() => import('../components/Confirm-Delete.vue'))

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const route = useRoute()

const {
  objects,
  error,
  next,
  showCarousel,
  markerFileName,
  showConfirm,
  editMode,
  showEdit,
  currentEdit,
} = storeToRefs(app)
const select2delete = ref({})
const { tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)
const { getScrollTarget, setVerticalScrollPosition } = scroll

onMounted(() => {
  const hash = route.hash
  if (hash) {
    markerFileName.value = hash.substring(2)
    showCarousel.value = true
  }
})

const groupObjects = computed(() => {
  const groups = []
  for (let i = 0; i < objects.value.length; i += CONFIG.group) {
    groups.push(objects.value.slice(i, i + CONFIG.group))
  }
  return groups
})

const onLoad = throttle((index, done) => {
  if (next.value) {
    app.fetchRecords(false, 'scroll')
  }
  done()
}, 1000)

const isAuthorOrAdmin = (rec) => {
  return Boolean(user.value && (user.value.isAdmin || user.value.email === rec.email) && editMode)
}

const tagsToApplyExist = () => {
  return tagsToApply.value && tagsToApply.value.length > 0 && user.value && user.value.isAdmin
}

const mergeTags = (rec) => {
  rec.tags = Array.from(new Set([...tagsToApply.value, ...rec.tags])).sort()
  app.saveRecord(rec)
  editOk(U + rec.filename)
}

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
  showCarousel.value = false
  markerFileName.value = null
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
