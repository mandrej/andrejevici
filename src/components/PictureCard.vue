<template>
  <q-card v-if="isPublished" :id="U + rec.filename" class="card" flat>
    <q-img
      loading="lazy"
      :ratio="4 / 3"
      :src="thumbUrl"
      @click="emit('carouselShow', rec.filename)"
      class="col cursor-pointer"
      spinner-color="grey-5"
    >
      <div
        v-if="rec.kind === 'video'"
        class="absolute-full flex flex-center"
        style="background: rgba(0, 0, 0, 0.2)"
      >
        <q-icon name="sym_r_play_circle" size="64px" color="white" />
      </div>
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
import { computed } from 'vue'

const props = defineProps<{
  rec: PhotoType
}>()

const thumbUrl = computed(() => props.rec.thumb || props.rec.url)
const isPublished = computed(
  () => (props.rec.kind === 'photo' && props.rec.thumb) || props.rec.kind === 'video',
)
const emit = defineEmits(['carouselShow'])
const app = useAppStore()
</script>
