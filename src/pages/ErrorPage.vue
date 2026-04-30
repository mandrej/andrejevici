<template>
  <q-card flat>
    <q-card-section>
      <div class="text-h1 text-weight-thin text-center">
        {{ props.code }}
      </div>
      <p class="q-ma-none text-body2 text-center">
        {{ text }}
      </p>
    </q-card-section>
    <q-separator />
    <q-card-actions align="right">
      <q-btn class="full-width" flat size="lg" to="/">Go Home</q-btn>
    </q-card-actions>
  </q-card>
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
