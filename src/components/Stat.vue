<template>
  <q-list class="q-py-md" v-if="bucket.count > 0">
    <q-item>
      <q-item-section>
        <q-item-label>SITE STATISTICS</q-item-label>
      </q-item-section>
    </q-item>
    <q-item
      v-for="item in list"
      :key="item.value"
      class="text-h6 text-warning text-weight-light"
      clickable
    >
      <q-item-section>
        {{ item.value }}
      </q-item-section>
      <q-item-section side>
        {{ item.text }}
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { formatBytes } from '../helpers'

const app = useAppStore()
const meta = useValuesStore()
const { bucket } = storeToRefs(app)
const { yearValues, tagsValues, modelValues, lensValues, emailValues } = storeToRefs(meta)
const list = computed(() => [
  {
    text: 'storage',
    value: formatBytes(bucket.value.size),
  },
  {
    text: 'photographs',
    value: bucket.value.count,
  },
  {
    text: 'years',
    value: yearValues.value.length,
  },
  {
    text: 'tags',
    value: tagsValues.value.length,
  },
  {
    text: 'cameras',
    value: modelValues.value.length,
  },
  {
    text: 'lenses',
    value: lensValues.value.length,
  },
  {
    text: 'authors',
    value: emailValues.value.length,
  },
])
</script>
