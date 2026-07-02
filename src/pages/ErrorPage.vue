<template>
  <div class="w-full max-w-sm mx-auto px-4">
    <div class="text-center py-6">
      <div class="text-8xl font-thin text-gray-300 dark:text-gray-600 mb-2">{{ props.code }}</div>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">{{ text }}</p>
    </div>
    <hr class="border-gray-200 dark:border-gray-700 mb-4" />
    <div class="flex justify-end">
      <AppButton to="/" flat label="Go Home" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '../components/atoms/AppButton.vue'

const props = defineProps({
  code: {
    type: Number,
    default: 404,
  },
})
const errors: Record<number, string> = {
  404: 'Oops. Nothing here...',
  401: 'Insufficient credentials...',
}
const text = ref(errors[props.code])
</script>
