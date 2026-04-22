<template>
  <q-card v-if="rec.thumb" :id="U + rec.filename" class="card" flat>
    <q-img
      loading="lazy"
      :ratio="4 / 3"
      :src="rec.thumb"
      @click="emit('carouselShow', rec.filename)"
      class="col cursor-pointer"
      spinner-color="grey-5"
    >
      <template #error>
        <FileBroken />
      </template>
    </q-img>
    <slot name="action"></slot>
    <q-card-section class="text-body1 ellipsis q-pb-none">
      {{ rec.headline }}
    </q-card-section>
    <q-card-section class="row justify-between q-pt-none">
      <span>
        <router-link to="/list" class="link" @click.prevent="app.searchBy({ nick: rec.nick })">{{
          rec.nick
        }}</router-link
        >,
        <router-link
          to="/list"
          @click.prevent="app.searchBy({ year: rec.year, month: rec.month, day: rec.day })"
          class="link"
          >{{ rec.date ? formatDatum(rec.date, 'DD.MM.YYYY HH:mm') : '' }}</router-link
        >
      </span>

      <q-icon
        v-if="rec.loc"
        name="sym_r_my_location"
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
import { U, formatDatum, openMaps } from '../helpers'
import type { PhotoType } from '../helpers/models'
import { useAppStore } from '../stores/app'
import FileBroken from './FileBroken.vue'

defineProps<{
  rec: PhotoType
}>()
const emit = defineEmits(['carouselShow'])
const app = useAppStore()
</script>
