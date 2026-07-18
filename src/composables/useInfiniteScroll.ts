import { useEffect, useRef, useState } from 'react'

export function useInfiniteScroll(
  onLoad: (done: (stop?: boolean) => void) => Promise<void>,
  options: IntersectionObserverInit = { rootMargin: '400px' },
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [stopped, setStopped] = useState(false)
  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad

  useEffect(() => {
    if (stopped || typeof window === 'undefined') return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading) {
        setLoading(true)
        onLoadRef.current((stop = false) => {
          setLoading(false)
          if (stop) {
            setStopped(true)
          }
        })
      }
    }, options)

    const el = sentinelRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) {
        observer.unobserve(el)
      }
      observer.disconnect()
    }
  }, [stopped, loading, options])

  const reset = () => {
    setStopped(false)
    setLoading(false)
  }

  return { sentinelRef, loading, stopped, reset }
}
