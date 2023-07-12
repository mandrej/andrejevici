<template>
  <q-dialog
    v-model="app.showConfirm"
    transition-show="slide-down"
    transition-hide="slide-up"
    persistent
  >
    <q-card class="q-dialog-plugin">
      <q-toolbar class="bg-grey-2 text-black row justify-between" bordered>
        <q-toolbar-title>Confirm Delete</q-toolbar-title>
      </q-toolbar>
      <q-card-section
        >Would you like to delete {{ formatBytes(rec.size) }} image named "{{
          rec.headline
        }}"?</q-card-section
      >
      <q-card-actions class="row justify-between q-pa-md q-col-gutter-md">
        <div class="col">
          <q-btn color="primary" label="OK" @click="emit('confirmOk', rec)" />
        </div>
        <div class="col text-right">
          <q-btn flat label="Close" @click="onCancel" />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useAppStore } from "../stores/app";
import { formatBytes } from "../helpers";

const emit = defineEmits(["confirmOk"]);
const props = defineProps({
  rec: Object,
});

const app = useAppStore();

window.onpopstate = function () {
  app.showConfirm = false;
};
const onCancel = () => {
  app.showConfirm = false;
};
</script>
