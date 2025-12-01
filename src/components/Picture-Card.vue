<template>
  <q-card v-if="rec.thumb" :id="U + rec.filename" class="card" flat>
    <q-img
      loading="lazy"
      :ratio="5 / 4"
      :src="rec.thumb"
      @click="emit('carousel-show', rec.filename)"
      class="col cursor-pointer"
      no-spinner
    >
      <template #error>
        <FileBroken />
      </template>
      <div class="absolute-bottom headline ellipsis">
        {{ rec.headline }}
      </div>
    </q-img>
    <slot name="action"></slot>
    <q-card-section class="row justify-between">
      <span>
        <router-link :to="{ path: '/list', query: { nick: rec.nick } }" class="link"
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
          class="link"
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

  <q-card v-else :id="U + rec.filename" class="card" flat>
    <q-img loading="lazy" :ratio="5 / 4" :src="rec.url" no-spinner>
      <template #error>
        <FileBroken />
      </template>
    </q-img>
    <slot name="action"></slot>
  </q-card>
</template>

<script setup lang="ts">
import { U, formatDatum } from 'src/helpers'
import type { PhotoType } from 'src/helpers/models'
import FileBroken from 'src/components/File-Broken.vue'

defineProps<{
  rec: PhotoType
}>()
const emit = defineEmits(['carousel-show'])

const openMaps = (loc: string) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${loc}`
  window.open(url, '_blank')
}
</script>
