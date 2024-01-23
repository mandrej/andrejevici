<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page v-if="last.href" class="row">
        <q-responsive
          :ratio="1.75"
          class="col-xs-12 col-md-6 last"
          :style="styling"
        >
          <router-link
            :to="last.href"
            style="display: block"
            v-ripple.early="{ color: 'purple' }"
          >
            <q-btn
              v-if="auth.user && auth.user.isAuthorized"
              fab
              icon="add"
              color="warning"
              class="absolute-top-left q-ma-md"
              to="/add"
            />
            <q-btn
              v-else
              fab
              icon="person"
              color="warning"
              class="absolute-top-left q-ma-md"
              @click="auth.signIn"
            />
            <div class="absolute-top-right text-white q-ma-md">
              {{ version }}
            </div>
          </router-link>
        </q-responsive>

        <div class="col-xs-12 col-md-6">
          <q-toolbar class="bg-grey-10 text-white q-pa-md">
            <q-toolbar-title class="text-h4" style="line-height: 100%">
              {{ $route.meta.title }}
              <br />
              <span class="text-body1"
                >{{ app.bucket.count }} photos since {{ app.since }} and
                counting</span
              >
            </q-toolbar-title>
            <History-Button
              v-if="app.find && Object.keys(app.find).length"
              size="2em"
            />
          </q-toolbar>
          <router-view />
        </div>
      </q-page>

      <q-page v-else>
        <q-toolbar class="bg-grey-10 text-white q-pa-md fixed">
          <q-toolbar-title class="text-h4" style="line-height: 100%">
            {{ $route.meta.title }}
          </q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-md">
          <q-img src="broken.svg" class="fixed-full" />
          <div
            class="row justify-center vertical-middle"
            style="height: calc(100vh)"
          >
            <div class="col-xs-12 col-sm-8 self-center">
              <p class="text-h5">
                There are no photos posted yet. To add some photos you need to
                sign-in with your Google account. Only registered users can add,
                delete or edit photos. Unregistered user can only browse photos
                other people add.
              </p>
              <p>
                This application is made for my personal photographic needs. I
                couldn't find any better nor cheeper solutions to store my
                photos. Application provide serching based on tags, year, month,
                day, model, lens and author. Application is build using
                <a href="https://firebase.google.com/">Firebase</a> on
                <a href="https://nodejs.org/">node.js</a> and
                <a href="https://quasar.dev/">Quasar</a>&nbsp;
                <a href="https://vuejs.org/">vue.js</a> framework.
              </p>
              <p v-if="auth.user && auth.user.isAuthorized">
                <q-btn-group spread>
                  <q-btn
                    color="primary"
                    to="/add"
                    :label="`Add some photos ${auth.user.name}`"
                  />
                  <q-btn
                    color="warning"
                    @click="auth.signIn"
                    label="Or Sign-Out"
                  />
                </q-btn-group>
              </p>
              <p class="text-center" v-else>
                <q-btn
                  color="warning"
                  @click="auth.signIn"
                  label="Sign in using your Google account"
                />
              </p>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted, computed } from "vue";
import { isEmpty } from "lodash";
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import { fileBroken, version } from "../helpers";
import HistoryButton from "../components/History-Button.vue";

const app = useAppStore();
const auth = useUserStore();
const last = computed(() => app.last);

onMounted(() => {
  app.getLast();
});

const styling = computed(() => {
  if (isEmpty(last)) {
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
  transition: background-image 0.2s ease-in-out;
}
</style>
