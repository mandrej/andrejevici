<template>
  <q-dialog v-model="trigger" transition-show="slide-down" transition-hide="slide-up" persistent>
    <q-card flat>
      <q-toolbar>
        <q-toolbar-title>{{ title }}</q-toolbar-title>
        <div class="absolute-bottom">
          <q-linear-progress v-if="progress" indeterminate color="warning" />
        </div>
      </q-toolbar>
      <q-card-section class="q-px-md q-pt-md">
        {{ message }}
      </q-card-section>
      <q-card-actions class="justify-between q-pa-md">
        <slot name="action"></slot>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
const trigger = defineModel<boolean>('trigger', { required: true })

defineProps({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  progress: {
    type: Boolean,
    required: false,
    default: false,
  },
})
</script>
