<template>
  <q-toolbar-title>
    <router-link to="/" class="text-h6" style="color: inherit; text-decoration: none">{{
      $route.meta.title
    }}</router-link>
  </q-toolbar-title>

  <div class="row absolute-bottom">
    <q-linear-progress
      v-for="(value, name) in progressInfo"
      :key="name"
      :value="value"
      color="warning"
      :style="{
        width:
          progressInfo && Object.keys(progressInfo).length > 0
            ? 100 / Object.keys(progressInfo).length + '%'
            : '100%',
      }"
    />
  </div>

  <q-space />
  <q-tabs v-model="addTab" shrink inline-label>
    <q-tab name="photo" icon="sym_r_image" label="Images" />
    <q-tab name="video" icon="sym_r_video_library" label="Videos" />
  </q-tabs>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'

const app = useAppStore()
const { progressInfo, addTab } = storeToRefs(app)
</script>
