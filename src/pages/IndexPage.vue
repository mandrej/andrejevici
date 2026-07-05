<template>
  <AppButton
    :label="user ? `Hi ${user.name}` : 'Sign in'"
    color="primary"
    @click="auth.signIn"
    :flat="user !== null"
    class="mb-4"
  />

  <div class="text-xs text-gray-400 mb-1">Build {{ build }}</div>
  <h1 class="text-4xl font-thin text-gray-900 dark:text-white mb-2">
    {{ $route.meta.title }}
  </h1>
  <div v-if="bucket.count > 0" class="text-sm text-gray-600 dark:text-gray-400 mb-4">
    {{ bucket.count }} photos since {{ sinceYear }} and counting
  </div>

  <!-- Top photographers -->
  <div class="flex flex-wrap justify-center gap-2 mt-2 mx-4">
    <AppButton
      v-for="nick in topNicks"
      :key="nick"
      :label="nick"
      color="secondary"
      class="bg-secondary/15! hover:bg-secondary/30! text-teal-800! dark:text-secondary! shadow-lg"
      @click="app.searchBy({ nick })"
      to="/list"
    />
  </div>

  <!-- Theme toggle -->
  <div
    class="fixed bottom-4 right-4 z-50 flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
  >
    <button
      v-for="opt in themeOptions"
      :key="opt.value"
      :class="[
        'flex items-center justify-center w-9 h-9 transition-colors text-sm',
        theme === opt.value
          ? 'bg-primary text-white'
          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700',
      ]"
      :title="opt.label"
      @click="theme = opt.value"
    >
      <AppIcon :name="opt.icon" class="w-5 h-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { build } from '../helpers'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useValuesStore } from '../stores/values'
import { useBucketStore } from '../stores/bucket'
import AppButton from '../components/atoms/AppButton.vue'
import AppIcon from '../components/atoms/AppIcon.vue'

const app = useAppStore()
const meta = useValuesStore()
const bucketStore = useBucketStore()
const auth = useUserStore()
const { user } = storeToRefs(auth)

const nickWithCount = computed(() => meta.nickWithCount)
const topNicks = Object.keys(nickWithCount.value).slice(0, 5)
const sinceYear = computed(() => meta.yearValues[meta.yearValues.length - 1])
const { bucket } = storeToRefs(bucketStore)
const { theme: appTheme } = storeToRefs(app)

const themeOptions = [
  { value: 'light', icon: 'light_mode', label: 'Light' },
  { value: 'dark', icon: 'dark_mode', label: 'Dark' },
  { value: 'auto', icon: 'brightness_6', label: 'Auto' },
] as const

/**
 * Two-way computed proxy for the app store's theme setting.
 */
const theme = computed({
  get: () => appTheme.value,
  set: (val: 'light' | 'dark' | 'auto') => app.setTheme(val),
})
</script>
