<template>
  <EditRecord v-if="showEdit" :rec="currentEdit" @edit-ok="editOk" />

  <!-- Confirm Delete Dialog -->
  <AppDialog v-model="showConfirm" max-width="max-w-sm">
    <div class="p-6">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-2">Confirm Delete</h2>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Would you like to delete {{ formatBytes(select2delete?.size || 0) }} photo named
        '{{ select2delete?.headline }}'?
      </p>
      <div class="flex justify-between gap-3">
        <AppButton color="primary" label="OK" @click="confirmOk(select2delete as PhotoType)" />
        <AppButton flat label="Close" @click="showConfirm = false" />
      </div>
    </div>
  </AppDialog>

  <ErrorBanner :inquiry="!busy && error === 'empty'">
    <template #title>No data found</template>
    <template #detail>for current filter / search</template>
  </ErrorBanner>

  <ErrorBanner :inquiry="!busy && error !== '' && error !== 'empty'">
    <template #title>Something went wrong ...</template>
    <template #detail>{{ error }}</template>
  </ErrorBanner>

  <SwiperView v-if="showCarousel" :index="index" @carousel-cancel="carouselCancel" />

  <div class="p-4 pb-16">
    <!-- Photo grid with transition-group -->
    <transition-group tag="div" class="flex flex-wrap gap-4" name="fade">
      <div
        v-for="item in objects"
        :key="item.filename"
        class="flex-shrink-0"
        style="min-width: 250px; max-width: 400px; flex: 1"
      >
        <PictureCard
          :rec="item"
          @carousel-show="carouselShow(item.filename)"
          @carousel-cancel="carouselCancel"
        >
          <template #action>
            <div
              v-if="isAuthorOrAdmin(user, item)"
              class="absolute top-2 right-2 flex flex-col gap-1"
            >
              <!-- Batch select checkbox -->
              <AppCheckbox
                v-if="user?.isAdmin || user?.email === item.email"
                v-model="selected"
                :val="item"
                class="bg-white/80 dark:bg-black/60 rounded-full p-1 backdrop-blur-sm"
              />
              <!-- Edit button -->
              <button
                class="bg-white/80 dark:bg-black/60 rounded-full p-1.5 backdrop-blur-sm text-secondary hover:scale-110 transition-transform"
                @click="editRecord(item)"
              >
                <span class="material-symbols-rounded text-xl leading-none">edit</span>
              </button>
            </div>
          </template>
        </PictureCard>
      </div>
    </transition-group>

    <!-- Infinite scroll sentinel -->
    <div ref="sentinel" class="h-1" />

    <!-- Loading spinner -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- End of list -->
    <div v-if="!next && objects.length > 0" class="text-center py-10">
      <span class="text-xs uppercase tracking-widest text-gray-400">
        End of list ({{ objects.length }} records)
      </span>
    </div>
  </div>

  <!-- Scroll-to-top button -->
  <Transition name="fade">
    <button
      v-if="showScrollTop"
      class="fixed bottom-5 right-5 z-50 p-3 rounded-full bg-warning text-black shadow-lg hover:scale-110 active:scale-95 transition-all"
      @click="scrollToTop"
    >
      <span class="material-symbols-rounded text-2xl">arrow_upward</span>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent, watch, nextTick, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useRoute } from 'vue-router'
import { fakeHistory, isAuthorOrAdmin, formatBytes } from '../helpers'
import { useInfiniteScroll } from '../composables/useInfiniteScroll'
import notify from '../helpers/notify'
import type { PhotoType } from '../helpers/models'

import PictureCard from '../components/PictureCard.vue'
import SwiperView from '../components/dialog/SwiperView.vue'
import ErrorBanner from '../components/ErrorBanner.vue'
import AppDialog from '../components/atoms/AppDialog.vue'
import AppButton from '../components/atoms/AppButton.vue'
import AppCheckbox from '../components/atoms/AppCheckbox.vue'
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

const select2delete = ref<PhotoType | null>(null)
const { user } = storeToRefs(auth)
const showScrollTop = ref(false)

let skipNextFindFetch = false

// Close dialogs on back button
window.onpopstate = () => {
  showConfirm.value = false
  showEdit.value = false
  showCarousel.value = false
}

// Scroll-to-top tracking
const onScroll = () => {
  showScrollTop.value = window.scrollY > 150
}
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

// Infinite scroll via IntersectionObserver
const { sentinel, loading, reset } = useInfiniteScroll(async (done) => {
  if (busy.value) {
    // Wait for busy to clear
    const unwatch = watch(busy, (val) => {
      if (!val) {
        unwatch()
        void onLoad(done)
      }
    })
    return
  }
  await onLoad(done)
})

const onLoad = async (done: (stop?: boolean) => void) => {
  if (error.value === 'empty' || (objects.value.length > 0 && !next.value)) {
    done(true)
    return
  }
  try {
    const isInitial = objects.value.length === 0
    await app.fetchRecords(isInitial)
    done(!next.value)
  } catch (err) {
    console.error('Infinite scroll error:', err)
    done(true)
  }
}

watch(
  find,
  async () => {
    reset()
    await nextTick()
    if (skipNextFindFetch) {
      skipNextFindFetch = false
      return
    }
    await app.fetchRecords(true)
  },
  { deep: true },
)

onMounted(() => {
  window.addEventListener('scroll', onScroll)
  if (route.hash) {
    const filename = route.hash.substring(2)
    setTimeout(() => { void findPhoto(filename) }, 1000)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

/**
 * Locates a photo by filename in the already-loaded object list or fetches it
 * from Firestore, then adjusts the active filter to its year/month and opens
 * the carousel at the photo's index. Shows a warning notification when not found.
 */
const findPhoto = async (c: string) => {
  let rec: PhotoType | null | undefined = objects.value.find((x) => x.filename === c)

  if (!rec) {
    rec = await app.fetchPhoto(c)
  }

  if (rec && rec.year && rec.month) {
    skipNextFindFetch = true
    app.find = { year: rec.year, month: rec.month }
    await app.fetchRecords(true)
  }

  index.value = objects.value.findIndex((x) => x.filename === c)
  if (index.value !== -1) {
    window.history.replaceState(history.state, '', history.state.current.replace(/#(.*)?/, ''))
    showCarousel.value = true
  } else {
    notify({ type: 'warning', message: 'Photo not found' })
  }
}

/**
 * Executes the confirmed deletion.
 */
const confirmOk = (rec: PhotoType) => {
  showConfirm.value = false
  app.deleteRecord(rec)
  if (objects.value.length === 0 && showCarousel.value) {
    showCarousel.value = false
    error.value = 'empty'
  }
}

/**
 * Opens the edit dialog for the given photo record.
 */
const editRecord = (rec: PhotoType) => {
  currentEdit.value = rec
  fakeHistory()
  showEdit.value = true
}

/**
 * Handles the `edit-ok` event from the edit dialog.
 */
const editOk = (filename: string) => {
  const el = document.getElementById(filename)
  if (!el) return
  el.classList.add('bounce')
  setTimeout(() => el.classList.remove('bounce'), 2000)
}

/**
 * Opens the carousel at the photo with the given filename.
 */
const carouselShow = (c: string) => {
  index.value = objects.value.findIndex((x) => x.filename === c)
  if (index.value !== -1) {
    fakeHistory()
    showCarousel.value = true
  } else {
    notify({ type: 'warning', message: 'Photo not found' })
  }
}

/**
 * Closes the carousel and scrolls the page back to the previously viewed card.
 */
const carouselCancel = (hash: string) => {
  showCarousel.value = false
  index.value = -1
  const el = document.getElementById(hash?.replace('#', '') ?? '')
  if (el) {
    window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
  }
}
</script>
