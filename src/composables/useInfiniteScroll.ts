import { useEffect, useRef, useState } from 'react'

type Status = 'idle' | 'loading' | 'stopped'

export function useInfiniteScroll(
  onLoad: (done: (stop?: boolean) => void) => Promise<void>,
  options: IntersectionObserverInit = { rootMargin: '800px' },
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const statusRef = useRef<Status>('idle')
  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && statusRef.current === 'idle') {
        statusRef.current = 'loading'
        setLoading(true)
        onLoadRef.current((stop = false) => {
          statusRef.current = stop ? 'stopped' : 'idle'
          setLoading(false)
        })
      }
    }, options)

    observerRef.current = observer
    const el = sentinelRef.current
    if (el) observer.observe(el)

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, []) // mount/unmount only — state is read via refs

  const reset = () => {
    statusRef.current = 'idle'
    setLoading(false)

    const el = sentinelRef.current
    const observer = observerRef.current
    if (el && observer) {
      observer.unobserve(el)
      setTimeout(() => observer.observe(el), 0)
    }
  }

  return { sentinelRef, loading, reset }
}
