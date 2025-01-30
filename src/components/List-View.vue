<template>
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
        <q-infinite-scroll @load="onLoad" :debounce="500" :offset="250">
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
                @carousel-show="fireAgain"
                @edit-record="emit('edit-record', item)"
                @merge-tags="mergeTags(item)"
                @confirm-delete="emit('confirm-delete', item)"
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
import { throttle } from 'quasar'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useValuesStore } from '../stores/values'
import { CONFIG, U } from '../helpers'

import PictureCard from '../components/Picture-Card.vue'

const props = defineProps({
  objects: Array,
})

const emit = defineEmits([
  'carousel-show',
  'carousel-cancel',
  'edit-record',
  'edit-ok',
  'confirm-delete',
])

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const { error, next, editMode } = storeToRefs(app)
const { tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)

const groupObjects = computed(() => {
  const groups = []
  for (let i = 0; i < props.objects.length; i += CONFIG.group) {
    groups.push(props.objects.slice(i, i + CONFIG.group))
  }
  return groups
})

const onLoad = throttle((index, done) => {
  if (next.value) {
    app.fetchRecords(false, 'scroll')
  }
  done()
}, 500)

const isAuthorOrAdmin = (rec) => {
  return Boolean(user.value && (user.value.isAdmin || user.value.email === rec.email) && editMode)
}

const tagsToApplyExist = () => {
  return tagsToApply.value && tagsToApply.value.length > 0 && user.value && user.value.isAdmin
}

const mergeTags = (rec) => {
  rec.tags = Array.from(new Set([...tagsToApply.value, ...rec.tags])).sort()
  app.saveRecord(rec)
  emit('edit-ok', U + rec.filename)
}

const fireAgain = (filename) => {
  emit('carousel-show', filename)
}
</script>
