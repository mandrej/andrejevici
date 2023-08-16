<template>
  <q-list class="q-py-md" v-if="app.bucket.count > 0">
    <q-item>
      <q-item-section>
        <q-item-label class="text-white" overline>SITE STATISTICS</q-item-label>
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
import { computed } from "vue";
import { useAppStore } from "../stores/app";
import { useValuesStore } from "../stores/values";
import { formatBytes } from "../helpers";

const app = useAppStore();
const meta = useValuesStore();
const list = computed(() => [
  {
    text: "storage",
    value: formatBytes(app.bucket.size),
  },
  {
    text: "photographs",
    value: app.bucket.count,
  },
  {
    text: "years",
    value: meta.yearValues.length,
  },
  {
    text: "tags",
    value: meta.tagsValues.length,
  },
  {
    text: "cameras",
    value: meta.modelValues.length,
  },
  {
    text: "lenses",
    value: meta.lensValues.length,
  },
  {
    text: "authors",
    value: meta.emailValues.length,
  },
]);
</script>
