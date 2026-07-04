import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Reactive screen-size composable to replace Quasar's $q.screen.
 */
export function useScreen() {
  const width = ref(window.innerWidth)

  const onResize = () => {
    width.value = window.innerWidth
  }

  onMounted(() => window.addEventListener('resize', onResize))
  onUnmounted(() => window.removeEventListener('resize', onResize))

  return {
    get gtXs() {
      return width.value > 600
    },
    get gtSm() {
      return width.value > 1024
    },
    get ltSm() {
      return width.value <= 600
    },
    get xs() {
      return width.value <= 600
    },
  }
}
