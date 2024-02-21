<template>
  <div class="q-pa-sm text-h4">
    <router-link
      v-for="(count, value) in meta.nickWithCount"
      :key="value"
      :title="`${value}: ${count}`"
      :to="{ path: '/list', query: { nick: value } }"
      class="q-px-sm text-black link"
      >{{ value }}</router-link
    >
  </div>
  <div class="q-pa-sm text-h5">
    <span v-for="(obj, index) in meta.yearWithCount" :key="index">
      <template v-if="index <= $q.screen.xs ? 9 : 99">
        <router-link
          :key="obj.value"
          :title="`${obj.value}: ${obj.count}`"
          :to="{ path: '/list', query: { year: obj.value } }"
          class="q-px-sm text-black link"
          >{{ obj.value }}</router-link
        >
      </template>
    </span>
  </div>
  <div class="q-px-md text-subtitle1 gt-xs">
    <router-link
      v-for="(count, value) in meta.tagsWithCount"
      :key="value"
      :title="`${value}: ${count}`"
      :to="{ path: '/list', query: { tags: value } }"
      class="q-pr-sm text-black link"
      >{{ value }}</router-link
    >
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useValuesStore } from "../stores/values";

const meta = useValuesStore();

onMounted(() => {
  meta.fieldCount("email");
  meta.fieldCount("year");
  meta.fieldCount("tags");
});
</script>

<style scoped>
.link {
  display: inline-block;
  text-decoration: none;
}
</style>
