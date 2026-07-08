import { ref, onMounted, onUnmounted } from 'vue'

let breakpointXs = 600
let breakpointSm = 768
let breakpointMd = 1024
let initialized = false

function initBreakpoints() {
  if (initialized || typeof window === 'undefined') return
  const style = window.getComputedStyle(document.documentElement)

  const xsVal = parseInt(style.getPropertyValue('--breakpoint-xs'), 10)
  const smVal = parseInt(style.getPropertyValue('--breakpoint-sm'), 10)
  const mdVal = parseInt(style.getPropertyValue('--breakpoint-md'), 10)

  if (!isNaN(xsVal)) breakpointXs = xsVal
  if (!isNaN(smVal)) breakpointSm = smVal
  if (!isNaN(mdVal)) breakpointMd = mdVal

  initialized = true
}

/**
 * Reactive screen-size composable to replace Quasar's $q.screen.
 */
export function useScreen() {
  initBreakpoints()
  const width = ref(window.innerWidth)

  const onResize = () => {
    width.value = window.innerWidth
  }

  onMounted(() => {
    // Re-run on mount to ensure Stylesheets are fully loaded and applied
    initialized = false
    initBreakpoints()
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
  })

  return {
    get gtXs() {
      return width.value > breakpointXs
    },
    get gtSm() {
      return width.value > breakpointSm
    },
    get gtMd() {
      return width.value > breakpointMd
    },
    get ltSm() {
      return width.value <= breakpointXs
    },
    get xs() {
      return width.value <= breakpointXs
    },
  }
}
