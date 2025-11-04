<template>
  <q-list v-if="bucket.count > 0">
    <q-item>
      <q-item-section>
        <q-item-label>SITE STATISTICS</q-item-label>
      </q-item-section>
    </q-item>
    <q-item v-for="item in list" :key="item.value">
      <q-item-section avatar>
        <q-icon :name="item.icon" class="text-grey" />
      </q-item-section>
      <q-item-section>
        <q-item-label class="text-body1">{{ item.text }}</q-item-label>
      </q-item-section>
      <q-item-section class="text-body1" side>{{ item.value }}</q-item-section>
    </q-item>
    <SendMessage />
  </q-list>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { formatBytes } from '../helpers'
import SendMessage from 'src/components/Send-Message.vue'

const app = useAppStore()
const meta = useValuesStore()
const { bucket } = storeToRefs(app)
const { yearValues, tagsValues, modelValues, lensValues, nickValues } = storeToRefs(meta)
const list = computed(() => [
  {
    text: 'storage',
    icon: 'storage',
    value: formatBytes(bucket.value.size),
  },
  {
    text: 'photographs',
    icon: 'photo_library',
    value: bucket.value.count,
  },
  {
    text: 'years',
    icon: 'history',
    value: yearValues.value.length,
  },
  {
    text: 'tags',
    icon: 'label',
    value: tagsValues.value.length,
  },
  {
    text: 'cameras',
    icon: 'photo_camera',
    value: modelValues.value.length,
  },
  {
    text: 'lenses',
    icon: 'camera',
    value: lensValues.value.length,
  },
  {
    text: 'authors',
    icon: 'group',
    value: nickValues.value.length,
  },
])
</script>
