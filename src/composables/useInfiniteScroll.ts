import { useEffect, useRef, useState } from 'react'

export function useInfiniteScroll(
  onLoad: (done: (stop?: boolean) => void) => Promise<void>,
  options: IntersectionObserverInit = { rootMargin: '800px' },
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [stopped, setStopped] = useState(false)
  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad

  // Keep loading/stopped in refs so the observer callback always sees current
  // values without the effect needing to re-subscribe every time they change.
  const loadingRef = useRef(loading)
  loadingRef.current = loading
  const stoppedRef = useRef(stopped)
  stoppedRef.current = stopped

  // Stabilise options so a new literal object each render doesn't retrigger.
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Keep a stable ref to the observer so reset() can re-arm it.
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingRef.current && !stoppedRef.current) {
        setLoading(true)
        onLoadRef.current((stop = false) => {
          setLoading(false)
          if (stop) {
            setStopped(true)
          }
        })
      }
    }, optionsRef.current)

    observerRef.current = observer

    const el = sentinelRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
      observer.disconnect()
      observerRef.current = null
    }
  }, []) // mount/unmount only — state is read via refs

  // Re-arm the observer after a filter reset so an already-intersecting
  // sentinel triggers a new intersection event.
  const reset = () => {
    setStopped(false)
    setLoading(false)
    stoppedRef.current = false
    loadingRef.current = false

    const el = sentinelRef.current
    const observer = observerRef.current
    if (el && observer) {
      observer.unobserve(el)
      // One microtask gap is enough for the browser to clear the entry.
      setTimeout(() => observer.observe(el), 0)
    }
  }

  return { sentinelRef, loading, stopped, reset }
}
