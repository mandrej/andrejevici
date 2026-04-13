<template>
  <q-layout view="hHh Lpr lFf">
    <q-header class="fixed-top">
      <q-toolbar>
        <q-btn flat dense round icon="sym_r_menu" aria-label="Menu" @click="drawer = !drawer" />
        <router-view name="toolbar" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" class="q-pb-sm column no-wrap" :width="320" show-if-above>
      <router-view name="sidebar" />
    </q-drawer>

    <q-page-container>
      <q-page>
        <router-view />
      </q-page>
    </q-page-container>

    <q-dialog
      v-model="showConsent"
      transition-show="slide-down"
      transition-hide="slide-up"
      persistent
    >
      <q-card flat>
        <q-toolbar>
          <q-toolbar-title>Accept notifications</q-toolbar-title>
          <div class="absolute-bottom">
            <q-linear-progress v-if="wait" indeterminate color="warning" />
          </div>
        </q-toolbar>
        <q-card-section class="q-px-md q-pt-md">
          Would you like to enable push notifications?
        </q-card-section>
        <q-card-actions class="justify-between q-pa-md">
          <q-btn flat label="Disable" :disable="wait" @click="onDisable" />
          <q-btn flat label="Enable" :disable="wait" @click="onEnable" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../stores/user'

const auth = useUserStore()
const { askPush } = storeToRefs(auth)

const drawer = ref(false)
const wait = ref(false)

// Show the dialog whenever askPush becomes true (and the browser supports Notification)
const showConsent = ref('Notification' in window && askPush.value)

watch(askPush, (newVal) => {
  showConsent.value = 'Notification' in window && newVal
})

const onEnable = async () => {
  wait.value = true
  await auth.enableNotifications()
  wait.value = false
}

const onDisable = async () => {
  wait.value = true
  await auth.disableNotifications()
  wait.value = false
}
</script>
