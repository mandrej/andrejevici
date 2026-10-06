import { getMessaging, onMessage, isSupported, type Messaging } from 'firebase/messaging'
import notify from '@/helpers/notify'
import { firebaseApp } from '@/firebase'

/**
 * Firebase Messaging is isolated in this module on purpose: it is only reached through a dynamic
 * `import()`, so its SDK (and the Installations SDK it pulls in) stays out of the initial bundle.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null
  try {
    if (!(await isSupported())) return null
    return getMessaging(firebaseApp)
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Firebase Messaging unavailable:', err)
    }
    return null
  }
}

/**
 * Subscribes to foreground push messages. Resolves to an unsubscribe function, or undefined when
 * messaging is unavailable (no service worker support, permission denied, …).
 */
export async function subscribeForegroundMessages(): Promise<(() => void) | undefined> {
  const messaging = await getMessagingInstance()
  if (!messaging) return undefined

  return onMessage(messaging, (payload) => {
    const body = payload.data?.body || payload.notification?.body
    if (!body) return

    notify({
      type: 'external',
      message: body,
      icon: 'sym_r_notifications',
      caption: payload.data?.title || payload.notification?.title || payload.messageId,
    })
  })
}
