<template>
  <div></div>
  <!-- <div class="q-pa-sm text-h4">
    <router-link
      v-for="(count, value) in meta.nickWithCount"
      :class="linkAttribute(count, CONFIG.nicksMin)"
      :key="value"
      :title="`${value}: ${count}`"
      :to="{ path: '/list', query: { nick: value } }"
      class="q-px-sm link"
      >{{ value }}</router-link
    >
  </div>
  <div class="q-pa-sm text-h5">
    <span v-for="(obj, index) in meta.yearWithCount" :key="index">
      <router-link
        :key="obj.value"
        :title="`${obj.value}: ${obj.count}`"
        :to="{ path: '/list', query: { year: obj.value } }"
        class="q-px-sm text-black link"
        >{{ obj.value }}</router-link
      >
    </span>
  </div>
  <q-scroll-area class="gt-sm" style="height: 30vh">
    <div class="q-px-md text-subtitle1">
      <router-link
        v-for="(count, value) in meta.tagsWithCount"
        :class="linkAttribute(count, CONFIG.tagsMin)"
        :key="value"
        :title="`${value}: ${count}`"
        :to="{ path: '/list', query: { tags: value } }"
        class="q-pr-sm link"
        >{{ value }}</router-link
      >
    </div>
  </q-scroll-area> -->
</template>

<script setup>
import { onMounted } from "vue";
import { useValuesStore } from "../stores/values";
// import CONFIG from "app/config";

const meta = useValuesStore();

onMounted(() => {
  meta.fieldCount("email");
  meta.fieldCount("year");
  meta.fieldCount("tags");
});

// const linkAttribute = (count, limit = 5) => {
//   if (count < limit) {
//     return "text-grey";
//   }
//   return "text-black";
// };
</script>

<!-- <style scoped>
.link {
  display: inline-block;
  text-decoration: none;
}
</style> -->
