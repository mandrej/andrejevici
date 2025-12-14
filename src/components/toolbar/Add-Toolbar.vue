<template>
  <q-toolbar-title>
    <router-link to="/" style="color: inherit; text-decoration: none">{{
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
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'

const app = useAppStore()
const { progressInfo } = storeToRefs(app)
</script>
