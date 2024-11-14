<template>
  <div class="text-h4 text-center">
    <router-link
      v-for="(count, value) in meta.nickWithCount"
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
import { isEmpty } from "lodash";
import { useValuesStore } from "../stores/values";

const meta = useValuesStore();

onMounted(() => {
  if (isEmpty(meta.values.email)) {
    meta.fieldCount("email");
    meta.fieldCount("year");
    meta.fieldCount("tags");
    meta.fieldCount("model");
    meta.fieldCount("lens");
  }
});
</script>
