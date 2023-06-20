<template>
  <q-page class="flex flex-center column">
    <div class="row">
      <div v-for="(obj, i) in objects" :key="i">
        <!-- <q-img
          :src="obj.url"
          style="display: block; height: 140px; max-width: 150px"
        /> -->
        <pre>{{ obj }}</pre>
      </div>
    </div>
    <div class="row">
      <pre>{{ bucket }}</pre>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, computed } from "vue";
import { useAppStore } from "../stores/app";

const app = useAppStore();
const bucket = computed(() => app.bucket);
const objects = computed(() => app.objects);

onMounted(() => {
  app.fetch();
  app.readBucketInfo();
  // app.bucketInfoNew();
});
</script>
