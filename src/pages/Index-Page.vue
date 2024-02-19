<template>
  <div class="q-pa-sm text-h4">
    <router-link
      v-for="obj in meta.nickWithCount"
      :key="obj.value"
      :title="`${obj.value}: ${obj.count}`"
      :to="{ path: '/list', query: { nick: obj.value } }"
      class="q-px-sm text-black link"
      >{{ obj.value }}</router-link
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
      v-for="obj in meta.tagsWithCount"
      :key="obj.value"
      :title="`${obj.value}: ${obj.count}`"
      :to="{ path: '/list', query: { tags: obj.value } }"
      class="q-pr-sm text-black link"
      >{{ obj.value }}</router-link
    >
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useValuesStore } from "../stores/values";

const meta = useValuesStore();

onMounted(() => {
  meta.yearCount();
  meta.emailCount();
  meta.tagsCount();
});
</script>

<style scoped>
.link {
  display: inline-block;
  text-decoration: none;
}
</style>
