<template>
  <Edit-Record v-if="showEdit" :rec="currentEdit" @edit-ok="editOk" />
  <Confirm-Delete v-if="showConfirm" :rec="select2delete" @confirm-ok="confirmOk" />

  <Swiper-View
    v-if="showCarousel"
    :index="index"
    @confirm-delete="confirmShow"
    @edit-record="editRecord"
    @carousel-cancel="carouselCancel"
  />

  <q-page>
    <ErrorBanner :inquiry="!busy && error == 'empty'">
      <template #title>No data found</template>
      <template #detail>for current filter/ search</template>
    </ErrorBanner>

    <ErrorBanner :inquiry="!busy && error != '' && error != 'empty'">
      <template #title>Something went wrong ...</template>
      <template #detail>{{ error }}</template>
    </ErrorBanner>

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
import { U } from '../helpers'
import notify from '../helpers/notify'
import type { PhotoType } from 'src/helpers/models'

import PictureCard from '../components/Picture-Card.vue'
import SwiperView from '../components/Swiper-View.vue'
import ErrorBanner from '../components/Error-Banner.vue'
const EditRecord = defineAsyncComponent(() => import('../components/Edit-Record.vue'))
const ConfirmDelete = defineAsyncComponent(() => import('../components/Confirm-Delete.vue'))

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const route = useRoute()
const index = ref(-1)

const { objects, busy, error, next, showCarousel, showConfirm, editMode, showEdit, currentEdit } =
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
      findPhoto(marker)
    }, 2000)()
  }
})

const findPhoto = (filename: string) => {
  // TODO Secure site
  // if (!user.value) {
  //   notify({
  //     type: 'warning',
  //     message: 'Please sign in to view details',
  //     position: 'center',
  //     multiLine: true,
  //     actions: [
  //       {
  //         label: 'Sign In',
  //         handler: auth.signIn,
  //       },
  //     ],
  //   })
  //   return
  // }
  index.value = objects.value.findIndex((x) => x.filename === filename)
  switch (index.value) {
    case -1:
      notify({ type: 'warning', message: 'Photo not found' })
      break
    default:
      // removeHash
      window.history.replaceState(history.state, '', history.state.current.replace(/#(.*)?/, ''))
      showCarousel.value = true
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const onLoad = async (index = 0, done: () => void) => {
  if (next.value !== '') {
    await app.fetchRecords(false)
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

const mergeTags = async (rec: PhotoType) => {
  rec.tags = Array.from(new Set([...(tagsToApply.value ?? []), ...(rec.tags ?? [])])).sort()
  try {
    await app.saveRecord(rec)
    editOk(U + rec.filename)
  } catch (error) {
    console.error('Failed to save record:', error)
    // Optionally show error notification to user
    // notify.error('Failed to save changes')
  }
}

const confirmShow = (rec: PhotoType) => {
  select2delete.value = rec
  showConfirm.value = true
}
const confirmOk = async (rec: PhotoType) => {
  showConfirm.value = false
  await app.deleteRecord(rec)
  if (objects.value.length === 0 && showCarousel.value) {
    showCarousel.value = false
    error.value = 'empty'
  }
}

const editRecord = (rec: PhotoType) => {
  currentEdit.value = rec
  showEdit.value = true
}
const editOk = (filename: string) => {
  // Yes, an HTML id attribute can technically contain a dot (.).
  // document.getElementById('my.id')
  // document.querySelector('#my\\.id')
  const el = document.getElementById(filename)
  if (!el) return
  el.classList.add('bounce')
  setTimeout(() => {
    el.classList.remove('bounce')
  }, 2000)
}

const carouselShow = async (filename: string) => {
  await nextTick()
  findPhoto(filename)
}
const carouselCancel = (hash: string) => {
  showCarousel.value = false
  index.value = -1
  const el = document.getElementById(hash.replace('#', ''))
  if (el) {
    const target = getScrollTarget(el)
    setVerticalScrollPosition(target, el.offsetTop, 400)
  }
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
