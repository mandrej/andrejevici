<template>
  <div class="q-pa-md q-gutter-md">
    <q-input
      v-model="tmp.text"
      :disable="app.busy"
      label="by text"
      clearable
      @blur="submit"
      :dense="$q.screen.xs"
      dark
    />
    <Complete
      v-model="tmp.tags"
      :options="app.tagValues"
      multiple
      label="by tags"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @update:model-value="
        (newValue) => {
          tmp.tags = newValue;
          submit();
        }
      "
    />
    <Complete
      v-model="tmp.year"
      class="col"
      :options="app.yearValues"
      autocomplete="label"
      label="by year"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @update:model-value="
        (newValue) => {
          tmp.year = newValue;
          submit();
        }
      "
    />
    <div class="row">
      <Complete
        v-model="tmp.month"
        class="col"
        :options="optionsMonth"
        autocomplete="label"
        label="by month"
        :disable="app.busy"
        behavior="menu"
        :dense="$q.screen.xs"
        dark
        @update:model-value="
          (newValue) => {
            tmp.month = newValue;
            submit();
          }
        "
      />
      <div class="col-1" />
      <Complete
        v-model="tmp.day"
        class="col"
        :options="optionsDay"
        autocomplete="label"
        label="by day"
        :disable="app.busy"
        behavior="menu"
        :dense="$q.screen.xs"
        dark
        @update:model-value="
          (newValue) => {
            tmp.day = newValue;
            submit();
          }
        "
      />
    </div>
    <Complete
      v-model="tmp.model"
      :options="app.modelValues"
      label="by model"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @update:model-value="
        (newValue) => {
          tmp.model = newValue;
          submit();
        }
      "
    />
    <Complete
      v-model="tmp.lens"
      :options="app.lensValues"
      label="by lens"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @update:model-value="
        (newValue) => {
          tmp.lens = newValue;
          submit();
        }
      "
    />
    <Complete
      v-model="tmp.nick"
      :options="app.nickValues"
      label="by author"
      :disable="app.busy"
      behavior="menu"
      :dense="$q.screen.xs"
      dark
      @update:model-value="
        (newValue) => {
          tmp.nick = newValue;
          submit();
        }
      "
    />
  </div>
</template>

<script setup>
import { onMounted, computed, watch, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAppStore } from "../stores/app";
import Complete from "./Complete.vue";
import { months } from "../helpers";
// import { isEqual } from "lodash/lang";

const app = useAppStore();
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
      if (
        typeof tmp.value[key] === "string" ||
        tmp.value[key] instanceof String
      ) {
        tmp.value[key] = [query[key]];
      }
    }
  });
  // const oldQuery = JSON.parse(JSON.stringify(app.find));
  // const newQuery = JSON.parse(JSON.stringify(tmp.value));
  // if (isEqual(oldQuery, newQuery)) {
  //   if (process.env.DEV)
  //     console.log("SKIPPED", invoked, JSON.stringify(oldQuery));
  //   return;
  // }
  // store query
  app.find = tmp.value;
  // fetch new query
  app.fetchRecords(true, invoked); // new filter with reset
  // this dispatch route change
  if (Object.keys(tmp.value).length) {
    if (route.hash) {
      router.push({ path: "/list", query: tmp.value, hash: route.hash });
    } else {
      router.push({ path: "/list", query: tmp.value });
    }
  } else {
    router.push({ path: "/" });
  }
};

onMounted(() => {
  if (route.name !== "list") return;
  queryDispatch(route.query, "mounted");
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
