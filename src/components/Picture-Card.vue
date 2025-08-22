<template>
  <q-card v-if="rec.thumb" v-bind="cardAttributes(rec.filename)" flat>
    <q-img
      loading="lazy"
      :ratio="5 / 4"
      :src="rec.thumb"
      @click="emit('carousel-show', rec.filename)"
      class="col cursor-pointer"
      no-spinner
    >
      <template #error>
        <img :src="fileBroken" />
      </template>
      <div class="absolute-bottom headline ellipsis">
        {{ rec.headline }}
      </div>
    </q-img>
    <slot name="action"></slot>
    <q-card-section class="row justify-between">
      <span>
        <router-link
          :to="{ path: '/list', query: { nick: CONFIG.familyMap.get(rec.email) } }"
          class="text-black undreline"
          >{{ CONFIG.familyMap.get(rec.email) }}
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
          >{{ rec.date ? formatDatum(rec.date, 'DD.MM.YYYY') : '' }}</router-link
        >
        {{ rec.date ? rec.date.substring(11) : '' }}
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
    <slot name="action"></slot>
  </q-card>
</template>

<script setup lang="ts">
import { fileBroken, formatDatum, U, reFilename } from '../helpers'
import { CONFIG } from '../helpers'
import type { PhotoType } from '../helpers/models'

defineProps<{
  rec: PhotoType
}>()
const emit = defineEmits(['carousel-show'])

const cardAttributes = (filename: string) => {
  let attr
  try {
    const match = filename.match(reFilename)
    if (match) {
      const [, name, ext] = match
      attr = {
        id: U + name,
        class: ext!.substring(1) + ' bg-grey-3',
      }
    } else {
      attr = {
        id: U + 'x',
        class: 'jpg bg-grey-3',
      }
    }
  } catch {
    attr = {
      id: U + 'x',
      class: 'jpg bg-grey-3',
    }
  }
  return attr
}

const openMaps = (loc: string) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${loc}`
  window.open(url, '_blank')
}
</script>
