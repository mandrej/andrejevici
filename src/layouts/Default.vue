<template>
  <div class="flex h-screen overflow-hidden bg-light-page dark:bg-dark-page">
    <!-- Sidebar (desktop always visible, mobile overlay) -->
    <aside
      :class="[
        'flex-shrink-0 flex flex-col h-full transition-transform duration-300 z-40',
        'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700',
        'w-80',
        // Mobile: slide in/out
        'fixed md:relative',
        drawer || isDesktop ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <router-view name="sidebar" />
    </aside>

    <!-- Mobile backdrop -->
    <Transition name="fade">
      <div
        v-if="drawer && !isDesktop"
        class="fixed inset-0 bg-black/40 z-30 md:hidden"
        @click="drawer = false"
      />
    </Transition>

    <!-- Main content area -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <!-- Header toolbar -->
      <header class="flex-shrink-0 relative flex items-center h-14 px-4 gap-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm z-20">
        <!-- Hamburger (mobile) or close (mobile open) -->
        <button
          class="flex-shrink-0 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          :aria-label="drawer ? 'Close menu' : 'Open menu'"
          @click="drawer = !drawer"
        >
          <span class="material-symbols-rounded text-2xl">{{ drawer && !isDesktop ? 'close' : 'menu' }}</span>
        </button>

        <!-- Page-specific toolbar slot -->
        <router-view name="toolbar" />
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <router-view />
      </main>
    </div>
  </div>

  <!-- Push notification consent dialog -->
  <AppDialog v-model="showConsent" persistent max-width="max-w-sm">
    <div class="p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Accept notifications</h2>
      <AppProgress v-if="wait" indeterminate color="warning" class="mb-3" />
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">Would you like to enable push notifications?</p>
      <div class="flex justify-between gap-3">
        <AppButton flat label="Disable" :disabled="wait" @click="onDisable" />
        <AppButton color="primary" label="Enable" :disabled="wait" @click="onEnable" />
      </div>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../stores/user'
import AppDialog from '../components/atoms/AppDialog.vue'
import AppButton from '../components/atoms/AppButton.vue'
import AppProgress from '../components/atoms/AppProgress.vue'

const auth = useUserStore()
const { askPush } = storeToRefs(auth)

const drawer = ref(false)
const wait = ref(false)
const isDesktop = ref(window.innerWidth >= 768)

// Track resize to auto-open drawer on desktop
const onResize = () => {
  isDesktop.value = window.innerWidth >= 768
  if (isDesktop.value) drawer.value = false
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// Show the dialog whenever askPush becomes true
const showConsent = ref('Notification' in window && askPush.value)

watch(askPush, (newVal) => {
  showConsent.value = 'Notification' in window && newVal
})

/**
 * Handles the enable action.
 */
const onEnable = async () => {
  wait.value = true
  await auth.enableNotifications()
  wait.value = false
}

/**
 * Handles the disable action.
 */
const onDisable = async () => {
  wait.value = true
  await auth.disableNotifications()
  wait.value = false
}
</script>
