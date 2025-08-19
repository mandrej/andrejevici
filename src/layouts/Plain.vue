<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page v-if="lastRecord && lastRecord.href" class="row">
        <q-responsive
          :ratio="1"
          class="col-xs-12 col-md-6 shadow-12"
          :style="imageStyle(lastRecord)"
        >
          <router-link
            :to="{ path: '/list' }"
            style="display: block"
            v-ripple.early="{ color: 'purple' }"
          >
            <q-btn
              v-if="user && user.isAuthorized"
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

        <div class="col-xs-12 col-md-6 q-pa-md column justify-center">
          <div class="row no-wrap self-center">
            <div class="text-h4 text-right text-weight-thin">
              <span class="q-ma-none text-body2 text-right">{{ version }}</span
              ><br />
              {{ $route.meta.title }}
              <p class="q-ma-none text-body2">
                {{ bucket.count }} photos since {{ sinceYear }} and counting
              </p>
            </div>
            <HistoryButton v-if="find && Object.keys(find).length" size="2.3em" />
          </div>

          <router-view />
        </div>
      </q-page>

      <q-page v-else class="window-height window-width row justify-center items-center">
        <div class="q-pa-md col-xs-12 col-sm-6 col-md-4 col-xl-3">
          <div class="text-h3 text-right text-weight-thin">
            <p class="q-ma-none text-body2 text-right">{{ version }}</p>
            {{ $route.meta.title }}
            <p class="q-ma-none text-body2">photo album</p>
          </div>

          <p class="text-h6 text-center">There are no photos posted yet</p>
          <p>To add some you need to sign-in with your Google account.</p>

          <p v-if="user && user.isAuthorized">
            <q-btn-group spread>
              <q-btn
                class="bg-warning text-dark"
                to="/add"
                :label="`Add some photos ${user.name}`"
              />
              <q-btn class="bg-warning text-dark" @click="auth.signIn" label="Or Sign-Out" />
            </q-btn-group>
          </p>

          <p class="text-center" v-else>
            <q-btn
              class="bg-warning text-dark"
              @click="auth.signIn"
              label="Sign in using your Google account"
            />
          </p>

          <p>Only registered family users can add, delete or edit photos.</p>

          <!-- <p>
            Unregistered user can only browse photos other people add. This application is made for
            my personal photographic needs. I couldn't find any better nor cheeper solutions to
            store my photos. Application provide searching based on tags, year, month, day, model,
            lens and author. Application is built using
            <a href="https://firebase.google.com/">Firebase</a> on
            <a href="https://nodejs.org/">node.js</a> and
            <a href="https://quasar.dev/">Quasar</a>&nbsp;
            <a href="https://vuejs.org/">vue.js</a> framework.
          </p> -->
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useValuesStore } from 'src/stores/values'
import { version, fileBroken } from '../helpers'
import HistoryButton from '../components/History-Button.vue'
import type { LastPhoto } from 'src/helpers/models'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const sinceYear = meta.yearValues[meta.yearValues.length - 1]
const { bucket, find } = storeToRefs(app)
const { user } = storeToRefs(auth)
const lastRecord = computed(() => app.lastRecord as LastPhoto)

const common = {
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  transition: 'background-image 0.2s ease-in-out',
}
const imageStyle = (rec: LastPhoto) => {
  if (rec.thumb) {
    return { ...common, backgroundImage: `url(${rec.url}), url(${rec.thumb})` }
  } else {
    return { ...common, backgroundImage: `url(${fileBroken})`, backgroundSize: '30%' }
  }
}
</script>
