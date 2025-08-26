<template>
  <Edit-Record v-if="showEdit" :rec="currentEdit" @edit-ok="editOk" />
  <Confirm-Delete v-if="showConfirm" :rec="select2delete" @confirm-ok="confirmOk" />
  <Swiper-View
    v-if="showCarousel"
    :index="index"
    @confirm-delete="confirmShow"
    @carousel-cancel="carouselCancel"
  />

  <q-page>
    <q-banner
      v-if="error"
      class="fixed-center text-center bg-warning q-pa-md"
      style="z-index: 100"
      rounded
    >
      <q-icon name="error_outline" size="4em" />
      <template v-if="error === 'empty'">
        <div class="text-h6">No data found</div>
        <div>for current filter/ search</div>
      </template>
      <template v-else>
        <div class="text-h6">Something went wrong ...</div>
        <div>{{ error }}</div>
      </template>
    </q-banner>

    <div class="q-pa-md q-mb-md">
      <q-infinite-scroll @load="onLoad" :debounce="500" :offset="250">
        <transition-group tag="div" class="row q-col-gutter-md" name="fade">
          <div
            v-for="item in objects"
            :key="item.filename"
            class="col"
            style="min-width: 250px; max-width: 400px"
          >
            <Picture-Card
              :rec="item"
              @carousel-show="carouselShow(item.filename)"
              @carouselCancel="carouselCancel"
            >
              <template #action>
                <q-card-actions
                  v-if="isAuthorOrAdmin(item) && editMode"
                  class="absolute-right column no-wrap"
                >
                  <q-btn flat round icon="delete" @click="confirmShow(item)" />
                  <q-btn flat round icon="edit" @click="editRecord(item)" />
                  <q-btn
                    v-if="tagsToApplyExist"
                    flat
                    round
                    icon="content_paste"
                    @click="mergeTags(item)"
                  />
                </q-card-actions>
              </template>
            </Picture-Card>
          </div>
        </transition-group>
      </q-infinite-scroll>
    </div>

    <q-page-scroller position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
      <q-btn fab icon="arrow_upward" color="warning" />
    </q-page-scroller>
  </q-page>
</template>

<script setup lang="ts">
import { scroll, debounce } from 'quasar'
import { ref, onMounted, nextTick, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useValuesStore } from '../stores/values'
import { useRoute } from 'vue-router'
import { U, fakeHistory, reFilename, removeHash } from '../helpers'
import notify from '../helpers/notify'
import type { PhotoType } from 'src/helpers/models'

import PictureCard from '../components/Picture-Card.vue'
import SwiperView from '../components/Swiper-View.vue'
const EditRecord = defineAsyncComponent(() => import('../components/Edit-Record.vue'))
const ConfirmDelete = defineAsyncComponent(() => import('../components/Confirm-Delete.vue'))

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const route = useRoute()
const index = ref(-1)

const { objects, error, next, showCarousel, showConfirm, editMode, showEdit, currentEdit } =
  storeToRefs(app)
const select2delete = ref({})
const { tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)
const { getScrollTarget, setVerticalScrollPosition } = scroll

onMounted(() => {
  const hash = route.hash
  if (hash) {
    const marker = hash.substring(2)
    debounce(() => {
      findIndex(marker)
    }, 2000)()
  }
})

const findIndex = (filename: string) => {
  index.value = objects.value.findIndex((x) => x.filename === filename)
  switch (index.value) {
    case -1:
      notify({ type: 'warning', message: 'Photo not found' })
      break
    default:
      showCarousel.value = true
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const onLoad = (index = 0, done: () => void) => {
  if (next.value) {
    app.fetchRecords(false)
  }
  done()
}

const isAuthorOrAdmin = (rec: PhotoType) => {
  return Boolean(user.value && (user.value.isAdmin || user.value.email === rec.email) && editMode)
}

const tagsToApplyExist = (): boolean => {
  return Boolean(
    tagsToApply.value && tagsToApply.value.length > 0 && user.value && user.value.isAdmin,
  )
}

const mergeTags = (rec: PhotoType) => {
  rec.tags = Array.from(new Set([...(tagsToApply.value ?? []), ...(rec.tags ?? [])])).sort()
  app.saveRecord(rec)
  editOk(U + rec.filename)
}

const confirmShow = (rec: PhotoType) => {
  select2delete.value = rec
  fakeHistory()
  showConfirm.value = true
}
const confirmOk = async (rec: PhotoType) => {
  showConfirm.value = false
  await app.deleteRecord(rec)
  if (objects.value.length === 0 && showCarousel.value) {
    showCarousel.value = false
    error.value = 'empty'
    removeHash()
  }
}

const editRecord = (rec: PhotoType) => {
  currentEdit.value = rec
  fakeHistory()
  showEdit.value = true
}
const editOk = (hash: string) => {
  const el = document.querySelector('#' + hash)
  if (!el) return
  el.classList.add('bounce')
  setTimeout(() => {
    el.classList.remove('bounce')
  }, 2000)
}

const carouselShow = (filename: string) => {
  fakeHistory()
  nextTick(() => {
    findIndex(filename)
  })
}
const carouselCancel = (hash: string) => {
  showCarousel.value = false
  index.value = -1
  const match = hash.match(reFilename)
  const [, id] = match ? match : []
  nextTick(() => {
    if (!id) {
      removeHash()
      return
    }
    const el = document.getElementById(id)
    if (!el) {
      removeHash()
      return
    }
    const target = getScrollTarget(el)
    setVerticalScrollPosition(target, el.offsetTop, 400)
    removeHash()
  })
}
</script>

<style lang="scss" scoped>
.q-btn,
.q-icon {
  color: $grey-3;
}
.q-btn.disabled {
  opacity: 0.2 !important;
}
</style>
