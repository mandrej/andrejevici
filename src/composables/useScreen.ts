import { ref, onMounted, onUnmounted } from 'vue'

export interface ScreenState {
  xs: boolean
  gtXs: boolean
  md: boolean
  gtMd: boolean
}

export function useScreen() {
  const screen = ref<ScreenState>({
    xs: false,
    gtXs: true,
    md: false,
    gtMd: true,
  })

  const updateScreen = () => {
    const width = window.innerWidth
    screen.value = {
      xs: width < 600, // Quasar XS is < 600px
      gtXs: width >= 600,
      md: width >= 600 && width < 1024,
      gtMd: width >= 1024,
    }
  }

  onMounted(() => {
    updateScreen()
    window.addEventListener('resize', updateScreen)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateScreen)
  })

  return screen
}
