<template>
  <div class="column">
    <div class="row justify-center">
      <div class="text-h1 text-center text-weight-thin">
        {{ props.code }}
        <p class="q-ma-none text-body2">
          {{ text }}
        </p>
        <q-btn class="full-width" flat size="lg" to="/">Go Home</q-btn>
      </div>
    </div>
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
