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
      <slot name="action"></slot>
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
import type { PhotoType } from './models'

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

const thumbStyle = (rec: PhotoType) => {
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

const openMaps = (loc: string) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${loc}`
  window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
.headline {
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
