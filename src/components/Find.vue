<template>
  <form class="q-pa-md q-gutter-md" autocomplete="off">
    <q-input
      v-model="tmp.text"
      :disable="app.busy"
      label="by title"
      clearable
      @blur="submit"
      :dense="$q.screen.xs"
      dark
    />
    <Auto-Complete
      v-model="tmp.tags"
      :options="meta.tagsValues"
      label="by tag"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      multiple
      @update:model-value="
        (newValue) => {
          tmp.tags = newValue;
          submit();
        }
      "
    />
    <Auto-Complete
      v-model="tmp.year"
      class="col"
      :options="meta.yearValues"
      label="by year"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @update:model-value="submit"
    />
    <div class="row">
      <Auto-Complete
        v-model="tmp.month"
        class="col"
        :options="optionsMonth"
        autocomplete="label"
        label="by month"
        :disable="app.busy"
        behavior="menu"
        :dense="$q.screen.xs"
        dark
        @update:model-value="submit"
      />
      <div class="col-1" />
      <Auto-Complete
        v-model="tmp.day"
        class="col"
        :options="optionsDay"
        autocomplete="label"
        label="by day"
        :disable="app.busy"
        behavior="menu"
        :dense="$q.screen.xs"
        dark
        @update:model-value="submit"
      />
    </div>
    <Auto-Complete
      v-model="tmp.model"
      :options="meta.modelValues"
      label="by model"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @update:model-value="submit"
    />
    <Auto-Complete
      v-model="tmp.lens"
      :options="meta.lensValues"
      label="by lens"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @update:model-value="submit"
    />
    <Auto-Complete
      v-model="tmp.nick"
      :options="meta.nickValues"
      label="by author"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @update:model-value="submit"
    />
  </form>
</template>

<script setup>
import { onMounted, computed, watch, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAppStore } from "../stores/app";
import { useValuesStore } from "../stores/values";
import AutoComplete from "./Auto-Complete.vue";
import { months } from "../helpers";

const app = useAppStore();
const meta = useValuesStore();
const route = useRoute();
const router = useRouter();
const tmp = ref({ ...app.find });

const queryDispatch = (query, invoked = "") => {
  tmp.value = { ...query };
  // delete keys without values
  Object.keys(query).forEach((key) => {
    if (tmp.value[key] == null) {
      delete tmp.value[key];
    }
  });
  // adopt to match types
  Object.keys(tmp.value).forEach((key) => {
    if (["year", "month", "day"].includes(key)) {
      tmp.value[key] = +query[key];
    } else if (key === "tags") {
      if (typeof tmp.value[key] === "string") {
        tmp.value[key] = [query[key]];
      }
    }
  });

  app.find = tmp.value;
  app.fetchRecords(true, invoked); // new filter with reset
  // this dispatch route change
  if (Object.keys(tmp.value).length) {
    router.push({ path: "/list", query: tmp.value, hash: route.hash });
  } else {
    router.push({ path: "/" });
  }
};

onMounted(() => {
  if (route.name !== "list") return;
  meta.fieldCount("model");
  meta.fieldCount("lens");
});

watch(
  route,
  (to) => {
    if (to.name !== "list") return;
    queryDispatch(to.query, "route");
  },
  { deep: true, immediate: true }
);

const submit = () => {
  queryDispatch(tmp.value, "submit");
};

const optionsMonth = computed(() => {
  return months.map((month, i) => ({ label: month, value: i + 1 }));
});
const optionsDay = computed(() => {
  const N = 31,
    from = 1,
    step = 1;
  return [...Array(N)]
    .map((_, i) => from + i * step)
    .map((day) => {
      return { label: "" + day, value: day };
    });
});
</script>
