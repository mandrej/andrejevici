<template>
  <div class="absolute-center text-center">
    <q-banner rounded class="text-white q-pa-md bg-negative">
      <div class="text-h3">{{ props.code }}</div>
      {{ text }}
      <template v-slot:action>
        <q-btn class="full-width" flat color="white" size="lg" to="/">Go Home</q-btn>
      </template>
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps({
  code: {
    type: Number,
    default: 404,
  },
})
const errors: { [key: number]: string } = {
  404: 'Oops. Nothing here...',
  401: 'Insufficient credentials...',
}
const text = ref(errors[props.code])
</script>
