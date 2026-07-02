<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-light-page dark:bg-dark-page">
    <!-- Left half: hero image or empty state -->
    <div
      v-if="isEmpty(nickValues)"
      class="flex flex-col justify-center items-center md:w-1/2 min-h-[50vh] md:min-h-screen"
    >
      <div class="text-center max-w-xs px-6 text-sm text-gray-600 dark:text-gray-300">
        There are no photos posted yet...<br />
        To add some you need to sign-in with your Google account. Only authorized users can add,
        delete or edit photos.
        <div class="mt-4">
          <AppButton
            v-if="user?.isAuthorized && user?.nick"
            to="/add"
            color="primary"
            label="Add photos / videos"
          />
        </div>
      </div>
    </div>

    <div v-else class="relative md:w-1/2 min-h-[50vh] md:min-h-screen overflow-hidden">
      <router-link :to="{ path: '/list' }" class="block absolute inset-0">
        <div
          class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
          :style="showUrl ? { backgroundImage: `url(${showUrl})` } : {}"
        />
        <div class="absolute inset-0 bg-[url('/logo.svg')] bg-center bg-contain bg-no-repeat opacity-40" />
      </router-link>

      <!-- Add photos button -->
      <AppButton
        v-if="user?.isAuthorized && user?.nick"
        to="/add"
        icon="add"
        color="warning"
        round
        class="absolute bottom-4 right-4 md:bottom-4 md:left-4 md:right-auto !p-3"
      />
    </div>

    <!-- Right half: router-view (sign-in, etc.) -->
    <div
      class="flex flex-col justify-center items-center md:w-1/2 min-h-[50vh] md:min-h-screen"
    >
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useValuesStore } from '../stores/values'
import { isEmpty, getYouTubeMaxResUrl } from '../helpers'
import type { PhotoType } from '../helpers/models'
import AppButton from '../components/atoms/AppButton.vue'

const app = useAppStore()
const auth = useUserStore()
const meta = useValuesStore()
const { user } = storeToRefs(auth)
const lastRecord = computed(() => app.lastRecord as PhotoType)
const nickValues = computed(() => meta.nickValues)

const showUrl = computed(() => {
  const rec = lastRecord.value
  if (!rec) return ''
  return rec.kind === 'video' ? getYouTubeMaxResUrl(rec.url) : rec.url
})
</script>
