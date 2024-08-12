<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page v-if="last.href" class="row">
        <q-responsive
          :ratio="1"
          class="col-xs-12 col-md-6 shadow-12"
          :style="imageStyle"
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
              text-color="dark"
              class="absolute-top-left q-ma-md bg-warning text-dark"
              to="/add"
            />
            <q-btn
              v-else
              fab
              icon="person"
              class="absolute-top-left q-ma-md bg-warning text-dark"
              @click="auth.signIn"
            />
          </router-link>
        </q-responsive>

        <div class="col-xs-12 col-md-6 q-pa-md row justify-center">
          <div class="row no-wrap self-center">
            <div class="text-h4 text-right text-weight-thin">
              <p class="q-ma-none text-body2 text-right">{{ version }}</p>
              {{ $route.meta.title }}
              <p class="q-ma-none text-body2">
                {{ app.bucket.count }} photos since {{ app.since }} and counting
              </p>
            </div>
            <History-Button
              v-if="app.find && Object.keys(app.find).length"
              size="2.3em"
            />
          </div>
          <!-- <div>
            <router-view />
          </div> -->
        </div>
      </q-page>

      <q-page v-else class="q-pa-md row justify-center" :style="brokenStyle">
        <div class="q-my-xl self-center">
          <div class="text-h3 text-right text-weight-thin">
            <p class="q-ma-none text-body2 text-right">{{ version }}</p>
            {{ $route.meta.title }}
          </div>
        </div>
        <div class="row justify-center">
          <div class="col-xs-12 col-sm-6">
            <p>
              There are no photos posted yet. To add some photos you need to
              sign-in with your Google account. Only registered users can add,
              delete or edit photos. Unregistered user can only browse photos
              other people add.
            </p>
            <p v-if="auth.user && auth.user.isAuthorized">
              <q-btn-group spread>
                <q-btn
                  class="bg-warning text-dark"
                  to="/add"
                  :label="`Add some photos ${auth.user.name}`"
                />
                <q-btn
                  class="bg-warning text-dark"
                  @click="auth.signIn"
                  label="Or Sign-Out"
                />
              </q-btn-group>
            </p>
            <p class="text-center" v-else>
              <q-btn
                class="bg-warning text-dark"
                @click="auth.signIn"
                label="Sign in using your Google account"
              />
            </p>
            <p>
              This application is made for my personal photographic needs. I
              couldn't find any better nor cheeper solutions to store my photos.
              Application provide searching based on tags, year, month, day,
              model, lens and author. Application is build using
              <a href="https://firebase.google.com/">Firebase</a> on
              <a href="https://nodejs.org/">node.js</a> and
              <a href="https://quasar.dev/">Quasar</a>&nbsp;
              <a href="https://vuejs.org/">vue.js</a> framework.
            </p>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted, computed } from "vue";
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

const common = "background-repeat: no-repeat; background-position: center;";
const imageStyle = computed(() => {
  return (
    "background-image: url(" +
    last.value.url +
    "), url(" +
    last.value.thumb +
    ");" +
    common +
    "background-size: cover;" +
    "transition: background-image 0.2s ease-in-out;"
  );
});
const brokenStyle = "background-image: url(" + fileBroken + ");" + common;
</script>
