<template>
  <q-layout view="hHh Lpr lFf">
    <q-header class="fixed-top">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawer = !drawer" />
        <router-view name="toolbar" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" class="q-pb-sm column no-wrap" :width="320" show-if-above bordered>
      <router-view name="sidebar" />
    </q-drawer>

    <q-page-container>
      <Ask-Permission v-if="showConsent" />
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from 'src/stores/user'

const AskPermission = defineAsyncComponent(() => import('src/components/Ask-Permission.vue'))

const auth = useUserStore()
const drawer = ref(false)
const { askPush } = storeToRefs(auth)

const showConsent = computed(() => {
  return Boolean('Notification' in window && askPush.value)
})
</script>
