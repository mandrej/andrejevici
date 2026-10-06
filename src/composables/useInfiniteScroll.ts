import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Outcome of a single load attempt:
 * - `more`: a page was appended and more pages exist.
 * - `end`: the list is exhausted; the observer stops until `reset()` is called.
 * - `error`: the load failed; the sentinel re-arms, but is not retried in a loop.
 */
export type InfiniteScrollResult = 'more' | 'end' | 'error'

type Status = 'idle' | 'loading' | 'stopped'

export function useInfiniteScroll(
  onLoad: () => Promise<InfiniteScrollResult>,
  options: IntersectionObserverInit = { rootMargin: '800px' },
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const statusRef = useRef<Status>('idle')
  const visibleRef = useRef(false)
  const generationRef = useRef(0)
  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad

  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (statusRef.current !== 'idle') return
    statusRef.current = 'loading'
    const generation = generationRef.current
    setLoading(true)

    let result: InfiniteScrollResult = 'error'
    try {
      result = await onLoadRef.current()
    } catch (err) {
      console.error('Infinite scroll load failed:', err)
    }

    if (generation !== generationRef.current) {
      // `reset()` superseded this attempt (typically the filter changed mid-request),
      // so its result describes the previous query. Re-evaluate against current state.
      if (visibleRef.current) void load()
      return
    }

    setLoading(false)

    if (result === 'end') {
      statusRef.current = 'stopped'
      return
    }

    statusRef.current = 'idle'

    // An IntersectionObserver only reports *changes* in visibility, so a sentinel
    // that never leaves the viewport (tall screens, short or client-filtered pages)
    // would never fire again and loading would silently stall. Keep loading while
    // it is on screen; `end`/`error` above are the only ways out.
    if (result === 'more' && visibleRef.current) void load()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting
      if (entry.isIntersecting) void load()
    }, options)

    observerRef.current = observer
    const el = sentinelRef.current
    if (el) observer.observe(el)

    return () => {
      observer.disconnect()
      observerRef.current = null
      visibleRef.current = false
    }
    // `load` is stable and `options` only seeds the observer once, so this effect
    // runs on mount/unmount only.
  }, [load])

  const reset = useCallback(() => {
    generationRef.current += 1
    statusRef.current = 'idle'
    setLoading(false)

    // Re-observing delivers a fresh initial intersection record, which restarts
    // loading when the sentinel is already on screen.
    const el = sentinelRef.current
    const observer = observerRef.current
    if (el && observer) {
      observer.unobserve(el)
      observer.observe(el)
    }
  }, [])

  return { sentinelRef, loading, reset }
}
