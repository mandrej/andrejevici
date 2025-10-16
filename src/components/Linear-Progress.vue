<template>
  <q-linear-progress v-if="busy" color="warning" indeterminate />
  <q-linear-progress
    v-else
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
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'

const app = useAppStore()
const { busy, progressInfo } = storeToRefs(app)
</script>
