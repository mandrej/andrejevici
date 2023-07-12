<template>
  <q-list class="q-py-md">
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
import { formatBytes } from "../helpers";

const app = useAppStore();
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
    value: app.values.year.length,
  },
  {
    text: "tags",
    value: app.values.tags.length,
  },
  {
    text: "cameras",
    value: app.values.model.length,
  },
  {
    text: "lenses",
    value: app.values.lens.length,
  },
  {
    text: "authors",
    value: app.values.email.length,
  },
]);
</script>
