<template>
  <Teleport to="body">
    <div
      class="notifications-layer fixed bottom-4 right-4 flex flex-col gap-2 z-[10000000] pointer-events-none w-80 max-w-[calc(100vw-2rem)]"
    >
      <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl pointer-events-auto cursor-pointer',
            'backdrop-blur-sm border border-white/10',
            toastClass(toast.type),
          ]"
          @click="dismiss(toast.id)"
        >
          <!-- Spinner or Icon -->
          <div class="flex-shrink-0">
            <span
              v-if="toast.spinner"
              class="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
            />
            <AppIcon v-else-if="toast.icon" :name="toast.icon" class="w-5 h-5 leading-none" />
            <AppIcon v-else :name="defaultIcon(toast.type)" class="w-5 h-5 leading-none" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div
              v-if="toast.html"
              class="text-sm font-medium leading-snug"
              v-html="toast.message"
            />
            <div v-else class="text-sm font-medium leading-snug">{{ toast.message }}</div>
            <div v-if="toast.caption" class="text-xs opacity-75 mt-0.5 truncate">
              {{ toast.caption }}
            </div>

            <!-- Actions -->
            <div v-if="toast.actions && toast.actions.length > 0" class="flex flex-wrap gap-2 mt-3">
              <button
                v-for="(action, i) in toast.actions"
                :key="i"
                @click.stop="handleAction(toast.id, action.handler)"
                class="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1"
                :class="
                  toast.type === 'warning'
                    ? 'bg-black/10 hover:bg-black/20'
                    : 'bg-white/20 hover:bg-white/30'
                "
                :style="action.color ? { color: action.color } : {}"
              >
                <AppIcon v-if="action.icon" :name="action.icon" class="w-4 h-4" />
                <span v-if="action.label">{{ action.label }}</span>
              </button>
            </div>
          </div>

          <!-- Close -->
          <button class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <AppIcon name="close" class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { toasts } from '../../composables/useNotify'
import type { Toast } from '../../composables/useNotify'
import AppIcon from './AppIcon.vue'

const dismiss = (id: number) => {
  const idx = toasts.value.findIndex((t) => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

const handleAction = (id: number, handler?: () => void) => {
  if (handler) handler()
  dismiss(id)
}

const toastClass = (type: Toast['type']) => {
  const map: Record<string, string> = {
    positive: 'bg-emerald-600/95 text-white',
    negative: 'bg-red-600/95 text-white',
    warning: 'bg-amber-500/95 text-black',
    info: 'bg-sky-500/95 text-white',
    ongoing: 'bg-blue-600/95 text-white',
    external: 'bg-violet-600/95 text-white',
  }
  return map[type ?? 'info'] ?? 'bg-gray-800/95 text-white'
}

const defaultIcon = (type: Toast['type']) => {
  const map: Record<string, string> = {
    positive: 'check_circle',
    negative: 'error',
    warning: 'warning',
    info: 'info',
    ongoing: 'hourglass_empty',
    external: 'notifications',
  }
  return map[type ?? 'info'] ?? 'info'
}
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
