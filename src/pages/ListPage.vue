<template>
  <EditRecord v-if="showEdit" :rec="currentEdit" @edit-ok="editOk" />
  <q-dialog
    v-model="showConfirm"
    transition-show="slide-down"
    transition-hide="slide-up"
    persistent
  >
    <q-card flat>
      <q-toolbar>
        <q-toolbar-title>Confirm Delete</q-toolbar-title>
      </q-toolbar>
      <q-card-section class="q-px-md q-pt-md">
        Would you like to delete {{ formatBytes(select2delete?.size || 0) }} photo named '{{
          select2delete?.headline
        }}'?
      </q-card-section>
      <q-card-actions class="justify-between q-pa-md">
        <q-btn color="primary" label="OK" @click="confirmOk(select2delete as PhotoType)" />
        <q-btn flat label="Close" style="color: var(--q-my-text)" @click="showConfirm = false" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <ErrorBanner :inquiry="!busy && error == 'empty'">
    <template #title>No data found</template>
    <template #detail>for current filter/ search</template>
  </ErrorBanner>

  <ErrorBanner :inquiry="!busy && error != '' && error != 'empty'">
    <template #title>Something went wrong ...</template>
    <template #detail>{{ error }}</template>
  </ErrorBanner>

  <SwiperView v-if="showCarousel" :index="index" @carousel-cancel="carouselCancel" />

  <div class="q-pa-md q-mb-md">
    <q-infinite-scroll ref="scrollRef" @load="onLoad" :debounce="500" :offset="500">
      <transition-group tag="div" class="row q-col-gutter-md" name="fade">
        <div
          v-for="item in objects"
          :key="item.filename"
          class="col"
          style="min-width: 250px; max-width: 400px"
        >
          <PictureCard
            :rec="item"
            @carousel-show="carouselShow(item.filename)"
            @carousel-cancel="carouselCancel"
          >
            <template #action>
              <q-card-actions
                v-if="isAuthorOrAdmin(user, item)"
                class="absolute-right column no-wrap"
              >
                <!-- Admin can select for batch actions -->
                <q-checkbox
                  v-if="user?.isAdmin"
                  v-model="selected"
                  :val="item"
                  color="secondary"
                  keep-color
                />

                <!-- If author but not admin, show delete button instead of checkbox -->
                <q-btn
                  v-if="!user?.isAdmin && user?.email === item.email"
                  flat
                  round
                  icon="sym_r_delete"
                  color="secondary"
                  @click="confirmShow(item)"
                />

                <!-- Both admin and author can edit -->
                <q-btn flat round icon="sym_r_edit" color="secondary" @click="editRecord(item)" />
              </q-card-actions>
            </template>
          </PictureCard>
        </div>
      </transition-group>
      <template v-slot:loading>
        <div class="row justify-center q-my-xl">
          <q-spinner-dots color="primary" size="40px" />
        </div>
      </template>
    </q-infinite-scroll>

    <div v-if="!next && objects.length > 0" class="text-center q-pa-xl">
      <div class="text-overline text-grey q-mb-sm">End of list</div>
    </div>
  </div>

  <q-page-scroller position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
    <q-btn fab icon="sym_r_arrow_upward" color="warning" />
  </q-page-scroller>
</template>

<script setup lang="ts">
import { scroll, debounce } from 'quasar'
import { ref, onMounted, defineAsyncComponent, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useRoute } from 'vue-router'
import { fakeHistory, isAuthorOrAdmin, formatBytes } from '../helpers'
import notify from '../helpers/notify'
import type { PhotoType } from '../helpers/models'

import PictureCard from '../components/PictureCard.vue'
import SwiperView from '../components/dialog/SwiperView.vue'
import ErrorBanner from '../components/ErrorBanner.vue'
const EditRecord = defineAsyncComponent(() => import('../components/dialog/EditRecord.vue'))

const app = useAppStore()
const auth = useUserStore()
const route = useRoute()
const index = ref(-1)

const {
  objects,
  busy,
  error,
  next,
  find,
  showCarousel,
  showConfirm,
  showEdit,
  currentEdit,
  selected,
} = storeToRefs(app)
const scrollRef = ref<{ reset: () => void } | null>(null)
const select2delete = ref<PhotoType | null>(null)
const { user } = storeToRefs(auth)
const { getScrollTarget, setVerticalScrollPosition } = scroll

// Close dialogs on back button
window.onpopstate = () => {
  showConfirm.value = false
  showEdit.value = false
  showCarousel.value = false
}

watch(
  find,
  async () => {
    // Reset scroll and objects for a fresh search
    scrollRef.value?.reset()
    await nextTick()
    // Initial fetch for the first page
    await app.fetchRecords(true)
  },
  { deep: true },
)

onMounted(() => {
  if (route.hash) {
    const filename = route.hash.substring(2)
    debounce(() => {
      findPhoto(filename)
    }, 1000)()
  }
})

const findPhoto = async (c: string) => {
  let rec: PhotoType | null | undefined = objects.value.find((x) => x.filename === c)

  if (!rec) {
    rec = await app.fetchPhoto(c)
  }

  if (rec && rec.year && rec.month) {
    app.find = { year: rec.year, month: rec.month }
    await app.fetchRecords(true)
  }

  index.value = objects.value.findIndex((x) => x.filename === c)
  if (index.value !== -1) {
    // removeHash
    window.history.replaceState(history.state, '', history.state.current.replace(/#(.*)?/, ''))
    showCarousel.value = true
  } else {
    notify({ type: 'warning', message: 'Photo not found' })
  }
}

const onLoad = async (index: number, done: (stop?: boolean) => void) => {
  // If we're already busy fetching, wait for it to finish and then check if we need more
  if (busy.value) {
    const stopWatch = watch(busy, (val) => {
      if (!val) {
        stopWatch()
        onLoad(index, done)
      }
    })
    return
  }

  // If we already know there are no results, or we reached the end, stop
  if (error.value === 'empty' || (objects.value.length > 0 && !next.value)) {
    done(true)
    return
  }

  try {
    const isInitial = objects.value.length === 0
    await app.fetchRecords(isInitial)
    // done(true) stops the scroll if next is empty
    done(!next.value)
  } catch (err) {
    console.error('Infinite scroll error:', err)
    done(true) // stop on error to avoid infinite loops
  }
}

const confirmShow = (rec: PhotoType) => {
  select2delete.value = rec
  fakeHistory()
  showConfirm.value = true
}
const confirmOk = (rec: PhotoType) => {
  showConfirm.value = false
  app.deleteRecord(rec)
  if (objects.value.length === 0 && showCarousel.value) {
    showCarousel.value = false
    error.value = 'empty'
  }
}

const editRecord = (rec: PhotoType) => {
  currentEdit.value = rec
  fakeHistory()
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

const carouselShow = (c: string) => {
  index.value = objects.value.findIndex((x) => x.filename === c)
  if (index.value !== -1) {
    fakeHistory()
    showCarousel.value = true
  } else {
    notify({ type: 'warning', message: 'Photo not found' })
  }
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
