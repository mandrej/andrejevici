import {
  logEvent,
  getAnalytics,
  initializeAnalytics,
  isSupported,
  type Analytics,
} from 'firebase/analytics'
import { firebaseApp } from '@/firebase'

/**
 * Firebase Analytics lives in this module on purpose: it is only reached through a dynamic
 * `import()`, so the Analytics and Installations SDKs stay out of the initial bundle.
 *
 * In development the tracking event is printed to the console instead.
 */
const isDev = process.env.NODE_ENV === 'development'

let analytics: Analytics | null | undefined

async function loadAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null
  if (analytics !== undefined) return analytics
  try {
    analytics = (await isSupported())
      ? isDev
        ? initializeAnalytics(firebaseApp, { config: { debug_mode: true } })
        : getAnalytics(firebaseApp)
      : null
  } catch (err) {
    if (isDev) console.warn('Firebase Analytics unavailable:', err)
    analytics = null
  }
  return analytics
}

export async function trackEvent(eventName: string, eventParams?: Record<string, unknown>) {
  if (isDev) {
    console.log(`[Analytics Dev] Event: ${eventName}`, eventParams)
  }
  const instance = await loadAnalytics()
  if (!instance) return
  logEvent(instance, eventName, eventParams)
}
