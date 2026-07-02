import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Composable that fires `onLoad` when the sentinel element scrolls into view.
 * Replaces Quasar's `q-infinite-scroll`.
 *
 * @param onLoad - Async callback called when more items should be loaded.
 *   Receives a `done(stop?)` function; call done(true) to stop the observer.
 * @param options - IntersectionObserver options (threshold, rootMargin, etc.)
 */
export function useInfiniteScroll(
  onLoad: (done: (stop?: boolean) => void) => Promise<void>,
  options: IntersectionObserverInit = { rootMargin: '400px' },
) {
  const sentinel = ref<HTMLElement | null>(null)
  const loading = ref(false)
  const stopped = ref(false)
  let observer: IntersectionObserver | null = null

  const trigger = async () => {
    if (loading.value || stopped.value) return
    loading.value = true

    await onLoad((stop = false) => {
      loading.value = false
      if (stop) {
        stopped.value = true
        observer?.disconnect()
      }
    })
  }

  /** Reset the scroller so it can fire again (e.g. after a filter change). */
  const reset = () => {
    stopped.value = false
    loading.value = false
    if (sentinel.value && observer) {
      observer.disconnect()
      observer.observe(sentinel.value)
    }
  }

  onMounted(() => {
    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        void trigger()
      }
    }, options)

    if (sentinel.value) observer.observe(sentinel.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return { sentinel, loading, stopped, reset }
}
