<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="row">
        <q-page-sticky
          v-show="auth.user.isAuthorized"
          position="top-left"
          :offset="[16, 16]"
          style="z-index: 1000"
        >
          <q-btn fab icon="add" color="warning" to="/add" />
        </q-page-sticky>

        <q-responsive
          :ratio="1"
          class="col-xs-12 col-sm-6 last"
          :style="styling"
        >
          <!-- <router-link
            v-if="app.last.href"
            :to="app.last.href"
            style="display: block"
            v-ripple.early="{ color: 'purple' }"
          > -->
          <div class="absolute-bottom-right text-white q-pa-sm">
            {{ version }}
          </div>
          <!-- </router-link> -->
        </q-responsive>

        <div class="col-xs-12 col-sm-6">
          <q-toolbar class="bg-grey-8 text-white q-pa-md">
            <q-toolbar-title class="text-h4" style="line-height: 100%">
              {{ $route.meta.title }}
              <br />
              <span class="text-body1"
                >{{ bucket.count }} photos since 2007 and counting</span
              >
            </q-toolbar-title>
            <!-- <q-btn
              v-if="app.find && Object.keys(app.find).length"
              size="2em"
              flat
              round
              icon="history"
              :to="{ name: 'list', query: app.find }"
            /> -->
          </q-toolbar>

          <router-view />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed } from "vue";
import { useBucketStore } from "../stores/bucket";
import { useCrudStore } from "../stores/crud";
import { useAuthStore } from "../stores/auth";
import { fileBroken, version } from "../helpers";

const crudStore = useCrudStore();
const bucketStore = useBucketStore();
const auth = useAuthStore();

const last = computed(() => crudStore.last);
const bucket = computed(() => bucketStore.bucket);

const styling = computed(() => {
  if (last.value) {
    const low = last.value.thumb;
    const high = last.value.url;
    return "background-image: url(" + high + "), url(" + low + ")";
  }
  return "background-image: url(" + fileBroken + ")";
});
</script>

<style scoped>
.last {
  position: relative;
  background-size: cover;
  background-position: center;
  transition: background-image 0.5s ease-in-out;
}
</style>
