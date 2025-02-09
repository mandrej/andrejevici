<template>
  <q-card v-if="rec.thumb" v-bind="cardAttributes(rec.filename)" flat>
    <q-card-section horizontal>
      <div
        class="col cursor-pointer"
        :style="thumbStyle(rec)"
        @click="emit('carousel-show', rec.filename)"
      >
        <div class="absolute-bottom headline q-pa-md ellipsis">
          {{ rec.headline }}
        </div>
      </div>
      <q-card-actions
        v-if="canManage && editMode"
        class="justify-around bg-grey-10 col"
        style="max-width: 58px; padding-bottom: 53px"
        vertical
      >
        <q-btn flat round icon="delete" @click="emit('confirm-delete', rec)" />
        <q-btn flat round icon="edit" @click="emit('edit-record', rec)" />
        <q-btn
          v-if="canMergeTags"
          flat
          round
          icon="content_paste"
          @click="emit('merge-tags', rec)"
        />
      </q-card-actions>
    </q-card-section>
    <q-card-section class="row justify-between">
      <span>
        <router-link :to="{ path: '/list', query: { nick: rec.nick } }" class="text-black undreline"
          >{{ rec.nick }}
        </router-link>
        ,
        <router-link
          :to="{
            path: '/list',
            query: {
              year: rec.year,
              month: rec.month,
              day: rec.day,
            },
          }"
          class="text-black undreline"
          >{{ formatDatum(rec.date, 'DD.MM.YYYY') }}</router-link
        >
        {{ rec.date.substring(11) }}
      </span>
      <q-icon
        v-if="rec.loc"
        name="my_location"
        size="24px"
        target="blank"
        color="grey-7"
        @click.stop.prevent="openMaps(rec.loc)"
      />
    </q-card-section>
  </q-card>

  <q-card v-else v-bind="cardAttributes(rec.filename)" flat>
    <q-img loading="lazy" :ratio="5 / 4" :src="rec.url" no-spinner>
      <template #error>
        <img :src="fileBroken" />
      </template>
    </q-img>
    <q-card-actions v-if="canManage" class="justify-between">
      <q-btn flat round icon="delete" @click="emit('delete-record', rec)" />
      <q-btn flat round icon="publish" @click="emit('edit-record', rec)" />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { fileBroken, formatDatum, U, reFilename } from '../helpers'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'stores/app'

const emit = defineEmits([
  'carousel-show',
  'confirm-delete',
  'edit-record',
  'merge-tags',
  'delete-record',
])
defineProps({
  rec: Object,
  canManage: Boolean,
  canMergeTags: Boolean,
})

const app = useAppStore()
const { editMode } = storeToRefs(app)

const cardAttributes = (filename) => {
  let attr
  try {
    const [, name, ext] = filename.match(reFilename)
    attr = {
      id: U + name,
      class: ext.substring(1) + ' bg-grey-3',
    }
  } catch {
    attr = {
      id: U + 'x',
      class: 'jpg bg-grey-3',
    }
  }
  return attr
}

const thumbStyle = (rec) => {
  const common = {
    height: '240px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
  if (rec.thumb) {
    return { ...common, backgroundImage: `url(${rec.thumb})` }
  } else {
    return { ...common, backgroundImage: `url(${fileBroken})`, backgroundSize: '30%' }
  }
}

const openMaps = (loc) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${loc}`
  window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
.q-btn,
.q-icon {
  color: $grey-7;
}
.q-btn.disabled {
  opacity: 0.2 !important;
}
.center {
  width: 25%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.headline {
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
