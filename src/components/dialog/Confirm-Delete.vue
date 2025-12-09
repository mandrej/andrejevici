<template>
  <q-dialog
    v-model="showConfirm"
    transition-show="slide-down"
    transition-hide="slide-up"
    persistent
  >
    <q-card flat>
      <q-toolbar>
        <q-toolbar-title>Confirm Delete</q-toolbar-title>
      </q-toolbar>
      <q-card-section
        >Would you like to delete {{ formatBytes(rec!.size) }} photo named "{{ rec!.headline }}"?
      </q-card-section>
      <q-card-actions class="justify-between q-pa-md">
        <q-btn color="primary" label="OK" @click="emit('confirm-ok', rec)" />
        <q-btn flat label="Close" @click="onCancel" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { formatBytes } from 'src/helpers'

const emit = defineEmits(['confirm-ok'])
defineProps({
  rec: Object,
})

const app = useAppStore()
const { showConfirm } = storeToRefs(app)

window.onpopstate = function () {
  showConfirm.value = false
}
const onCancel = () => {
  showConfirm.value = false
}
</script>
