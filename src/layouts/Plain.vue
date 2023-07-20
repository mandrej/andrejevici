<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="row">
        <q-page-sticky
          v-if="auth.user.isAuthorized && bucket.count > 0"
          position="top-left"
          :offset="[16, 16]"
          style="z-index: 1000"
        >
          <q-btn fab icon="add" color="warning" to="/add" />
        </q-page-sticky>
        <q-responsive
          v-if="bucket.count > 0"
          :ratio="1"
          class="col-xs-12 col-sm-6 last"
          :style="styling"
        >
          <router-link
            v-if="last.href"
            :to="last.href"
            style="display: block"
            v-ripple.early="{ color: 'purple' }"
          >
            <div class="absolute-bottom-right text-white q-pa-sm">
              {{ version }}
            </div>
          </router-link>
        </q-responsive>

        <q-responsive v-else :ratio="1" class="col-xs-12 col-sm-6">
          <q-btn v-if="auth.user.isAuthorized" to="/add" padding="lg">
            <div class="row items-center no-wrap">
              <q-icon left name="add" />
              You can add some photos<br />{{ auth.user.name }}
            </div>
          </q-btn>
          <q-btn v-else @click="auth.signIn" class="bg-warning" padding="lg">
            <div class="row items-center no-wrap">
              <q-icon left name="person" />
              <div class="text-center">
                Press to Sign-in with your Google<br />
                account to add some photos
              </div>
            </div>
          </q-btn>
        </q-responsive>

        <div class="col-xs-12 col-sm-6">
          <q-toolbar class="bg-grey-8 text-white q-pa-md">
            <q-toolbar-title class="text-h4" style="line-height: 100%">
              {{ $route.meta.title }}
              <br />
              <span v-if="bucket.count > 0" class="text-body1"
                >{{ bucket.count }} photos since {{ crudStore.since }} and
                counting</span
              >
            </q-toolbar-title>
            <q-btn
              v-if="crudStore.find && Object.keys(crudStore.find).length"
              size="2em"
              flat
              round
              icon="history"
              :to="{ name: 'list', query: crudStore.find }"
            />
          </q-toolbar>

          <router-view />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed } from "vue";
import { isEmpty } from "lodash";
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
  if (isEmpty(last.value)) {
    return "background-image: url(" + fileBroken + ")";
  }
  return (
    "background-image: url(" +
    last.value.url +
    "), url(" +
    last.value.thumb +
    ")"
  );
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
