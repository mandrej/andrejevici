<template>
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from 'src/stores/user'

const auth = useUserStore()
const { askPush } = storeToRefs(auth)

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
