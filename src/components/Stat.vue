<template>
  <q-list class="q-py-md" v-if="bucketStore.bucket.count > 0">
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
import { useBucketStore } from "../stores/bucket";
import { useValuesStore } from "../stores/values";
import { formatBytes } from "../helpers";

const bucketStore = useBucketStore();
const valuesStore = useValuesStore();
const list = computed(() => [
  {
    text: "storage",
    value: formatBytes(bucketStore.bucket.size),
  },
  {
    text: "photographs",
    value: bucketStore.bucket.count,
  },
  {
    text: "years",
    value: valuesStore.values.year.length,
  },
  {
    text: "tags",
    value: valuesStore.values.tags.length,
  },
  {
    text: "cameras",
    value: valuesStore.values.model.length,
  },
  {
    text: "lenses",
    value: valuesStore.values.lens.length,
  },
  {
    text: "authors",
    value: valuesStore.values.email.length,
  },
]);
</script>
