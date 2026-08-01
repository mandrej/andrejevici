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

    const el = sentinelRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
      observer.disconnect()
    }
  }, []) // mount/unmount only — state is read via refs

  const reset = () => {
    setStopped(false)
    setLoading(false)
  }

  return { sentinelRef, loading, stopped, reset }
}
