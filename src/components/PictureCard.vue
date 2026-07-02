<template>
  <!-- Published photo card -->
  <div v-if="isPublished" :id="U + rec.filename" class="card group">
    <!-- Thumbnail image with aspect ratio -->
    <div class="relative w-full overflow-hidden" style="padding-top: 75%">
      <img
        loading="lazy"
        :src="thumbUrl"
        :alt="rec.headline || rec.filename"
        class="absolute inset-0 w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
        @click="emit('carouselShow', rec.filename)"
        @error="imgError = true"
      />
      <!-- Broken image -->
      <FileBroken v-if="imgError" />
      <!-- Video play overlay -->
      <div
        v-if="rec.kind === 'video'"
        class="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
      >
        <span class="material-symbols-rounded text-white drop-shadow-lg" style="font-size: 64px;">play_circle</span>
      </div>
    </div>

    <!-- Action slot (edit button, checkbox) -->
    <slot name="action" />

    <!-- Caption -->
    <div class="px-3 py-1 text-sm font-medium truncate text-gray-900 dark:text-gray-100">
      {{ rec.headline }}
    </div>
    <div class="flex items-center justify-between px-3 pb-2 text-xs text-gray-500 dark:text-gray-400">
      <span>
        <a
          href="#"
          class="link hover:text-primary transition-colors"
          @click.prevent="app.searchBy({ nick: rec.nick })"
        >{{ rec.nick }}</a>,
        <a
          href="#"
          class="link hover:text-primary transition-colors"
          @click.prevent="app.searchBy({ year: rec.year, month: rec.month, day: rec.day })"
        >{{ rec.date ? formatDatum(rec.date, 'DD.MM.YYYY HH:mm') : '' }}</a>
      </span>
      <button
        v-if="rec.loc"
        class="hover:text-primary transition-colors"
        @click.stop.prevent="openMaps(rec.loc)"
      >
        <span class="material-symbols-rounded" style="font-size: 20px;">my_location</span>
      </button>
    </div>
  </div>

  <!-- Unpublished (upload queue) card -->
  <div v-else :id="U + rec.filename" class="card">
    <div class="relative w-full overflow-hidden" style="padding-top: 80%">
      <img
        loading="lazy"
        :src="rec.url"
        :alt="rec.filename"
        class="absolute inset-0 w-full h-full object-cover"
        @error="imgError = true"
      />
      <FileBroken v-if="imgError" />
    </div>
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { U, formatDatum, openMaps } from '../helpers'
import type { PhotoType } from '../helpers/models'
import { useAppStore } from '../stores/app'
import FileBroken from './FileBroken.vue'
import { computed } from 'vue'

const props = defineProps<{
  rec: PhotoType
}>()

const imgError = ref(false)
const thumbUrl = computed(() => props.rec.thumb || props.rec.url)
const isPublished = computed(
  () => (props.rec.kind === 'photo' && props.rec.thumb) || props.rec.kind === 'video',
)
const emit = defineEmits(['carouselShow'])
const app = useAppStore()
</script>
