<template>
  <q-page class="flex flex-center column">
    <router-link to="/add">Upload</router-link>
    <div class="row">
      <div v-for="(obj, i) in objects" :key="i">
        <q-img
          :src="obj.url"
          style="display: block; height: 150px; width: 150px"
        />
        <!-- <p>
          {{
            date.formatDate(obj.date.seconds * 1000, "YYYY-MM-DDTHH:mm:ss.SSSZ")
          }}
        </p> -->
      </div>
    </div>
    <div class="row">
      <pre>{{ bucketState }}</pre>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, computed } from "vue";
import { useBucketStore } from "../stores/bucket";
import { useCrudStore } from "../stores/crud";
import { date } from "quasar";

const bucketStore = useBucketStore();
const crudStore = useCrudStore();
const bucketState = computed(() => bucketStore.bucket);
const objects = computed(() => crudStore.objects);

onMounted(() => {
  crudStore.fetch();
  // bucketStore.read();
  bucketStore.scretch();
});
</script>
