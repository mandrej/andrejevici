<template>
  <q-card v-if="rec.thumb" v-bind="cardAttributes(rec.filename)">
    <q-card-section horizontal>
      <q-img
        class="col"
        style="height: 240px"
        loading="lazy"
        :src="rec.thumb"
        v-ripple.early="{ color: 'purple' }"
        @click="emit('carousel-show', rec.filename)"
        no-spinner
      >
        <template #error>
          <img :src="fileBroken" class="center" />
        </template>
        <div class="absolute-bottom text-subtitle2 ellipsis">
          {{ rec.headline }}
        </div>
      </q-img>
      <q-card-actions
        v-if="canManage && editMode"
        class="justify-around bg-grey-10 col"
        style="max-width: 58px"
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
        <!-- <q-btn flat round icon="open_in_full" @click="emit('carousel-show', rec.filename)" /> -->
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

  <q-card v-else v-bind="cardAttributes(rec.filename)">
    <q-img class="cursor-pointer" loading="lazy" :ratio="5 / 4" :src="rec.url" no-spinner>
      <template #error>
        <img :src="fileBroken" />
      </template>
      <q-badge floating class="text-black" color="warning">
        {{ formatBytes(rec.size) }}
      </q-badge>
    </q-img>
    <q-card-actions v-if="canManage" class="justify-between">
      <q-btn flat round icon="delete" @click="emit('delete-record', rec)" />
      <q-btn flat round icon="publish" @click="emit('edit-record', rec)" />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { fileBroken, formatDatum, formatBytes, U, reFilename } from '../helpers'
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
      class: ext.substring(1),
    }
  } catch {
    attr = {
      id: U + 'x',
      class: 'jpg',
    }
  }
  return attr
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
</style>
