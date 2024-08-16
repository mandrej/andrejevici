<template>
  <div class="text-h4 text-center">
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
</template>

<script setup>
import { onMounted } from "vue";
import { useValuesStore } from "../stores/values";
import CONFIG from "app/config";

const meta = useValuesStore();

// onMounted(() => {
//   meta.fieldCount("email");
//   meta.fieldCount("year");
//   meta.fieldCount("tags");
// });
const linkAttribute = (count, limit = 5) => {
  if (count < limit) {
    return "text-grey";
  }
  return "text-black";
};
</script>

<style scoped>
.link {
  display: inline-block;
  text-decoration: none;
}
</style>
