import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getMessaging, type Messaging } from 'firebase/messaging'
import { getAnalytics, logEvent, initializeAnalytics, type Analytics } from 'firebase/analytics'
import CONFIG from './config'

const firebaseApp = initializeApp(CONFIG.firebase)
const auth = getAuth(firebaseApp)
const storage = getStorage(firebaseApp)
const db = getFirestore(firebaseApp)
const functions = getFunctions(firebaseApp)
const messaging =
  typeof window !== 'undefined' ? getMessaging(firebaseApp) : (null as unknown as Messaging)
const analytics =
  typeof window !== 'undefined'
    ? process.env.NODE_ENV === 'development'
      ? initializeAnalytics(firebaseApp, { config: { debug_mode: true } })
      : getAnalytics(firebaseApp)
    : (null as unknown as Analytics)

/**
 * Logs an analytics event safely, checking if Analytics is active.
 * In development, prints the tracking event to console.log instead.
 */
function logAnalyticsEvent(eventName: string, eventParams?: Record<string, unknown>) {
  if (analytics) {
    logEvent(analytics, eventName, eventParams)
  }
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics Dev] Event: ${eventName}`, eventParams)
  }
}

if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

export { auth, db, storage, functions, messaging, analytics, logAnalyticsEvent }
