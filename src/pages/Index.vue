<template>
  <div class="q-pa-sm text-h4">
    <router-link
      v-for="obj in valuesStore.nickCountValues"
      :key="obj.value"
      :title="obj.value + ': ' + obj.count"
      :to="{ path: '/list', query: { nick: obj.value } }"
      class="q-px-sm text-black link"
      >{{ obj.value }}</router-link
    >
  </div>
  <div class="q-pa-sm text-h5">
    <span v-for="(obj, index) in valuesStore.values.year" :key="index">
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
      v-for="obj in valuesStore.values.tags"
      :key="obj.value"
      :title="obj.value + ': ' + obj.count"
      :to="{ path: '/list', query: { tags: obj.value } }"
      class="q-pr-sm text-black link"
      >{{ obj.value }}</router-link
    >
  </div>
</template>

<script setup>
import { onMounted } from "vue";
// import { useCrudStore } from "../stores/crud";
import { useValuesStore } from "../stores/values";
import { useAuthStore } from "../stores/auth";

// const crudStore = useCrudStore();
const valuesStore = useValuesStore();
const auth = useAuthStore();

onMounted(() => {
  // crudStore.getLast();
  auth.getPermission();
});
</script>

<style scoped>
.link {
  display: inline-block;
  text-decoration: none;
}
</style>
