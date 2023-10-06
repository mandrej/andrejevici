<template>
  <div class="q-pa-sm text-h4">
    <router-link
      v-for="obj in meta.nickCount"
      :key="obj.value"
      :title="obj.value + ': ' + obj.count"
      :to="{ path: '/list', query: { nick: obj.value } }"
      class="q-px-sm text-black link"
      >{{ obj.value }}</router-link
    >
  </div>
  <div class="q-pa-sm text-h5">
    <span v-for="(obj, index) in meta.values.year" :key="index">
      <template v-if="index <= $q.screen.xs ? 9 : 99">
        <router-link
          :key="obj.value"
          :title="obj.value + ': ' + obj.count"
          :to="{ path: '/list', query: { year: obj.value } }"
          class="q-px-sm text-black link"
          >{{ obj.value }}</router-link
        >
      </template>
    </span>
  </div>
  <div class="q-px-md text-subtitle1 gt-xs">
    <router-link
      v-for="obj in meta.values.tags"
      :key="obj.value"
      :title="obj.value + ': ' + obj.count"
      :to="{ path: '/list', query: { tags: obj.value } }"
      class="q-pr-sm text-black link"
      >{{ obj.value }}</router-link
    >
  </div>
  <div class="q-pa-md text-body2 gt-sm">
    This application is made for my personal photographic needs. I couldn't find
    any better nor cheeper solutions to store my photos. Application provide
    serching based on tags, year, month, day, model, lens and author.
    Application is build using
    <a href="https://firebase.google.com/">Firebase</a> on
    <a href="https://nodejs.org/">node.js</a> and
    <a href="https://quasar.dev/">Quasar</a>&nbsp;
    <a href="https://vuejs.org/">vue.js</a> framework
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
