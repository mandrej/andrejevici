import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth as getFirebaseAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import {
  getStorage as getFirebaseStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from 'firebase/storage'
import {
  getFirestore as getFirebaseFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore'
import {
  getFunctions as getFirebaseFunctions,
  connectFunctionsEmulator,
  type Functions,
} from 'firebase/functions'
import CONFIG from '@/config'

const isDev = process.env.NODE_ENV === 'development'

export const firebaseApp: FirebaseApp = initializeApp(CONFIG.firebase)

let authInstance: Auth | null = null
let storageInstance: FirebaseStorage | null = null
let dbInstance: Firestore | null = null
let functionsInstance: Functions | null = null

/**
 * Firebase services are created on first use, so SDK modules a route never touches stay out of
 * its initial bundle. Components and stores must call these accessors instead of caching the
 * result at module scope.
 */
export const auth = (): Auth => {
  if (!authInstance) {
    authInstance = getFirebaseAuth(firebaseApp)
    if (isDev) connectAuthEmulator(authInstance, 'http://127.0.0.1:9099')
  }
  return authInstance
}

export const db = (): Firestore => {
  if (!dbInstance) {
    dbInstance = getFirebaseFirestore(firebaseApp)
    if (isDev) connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080)
  }
  return dbInstance
}

export const storage = (): FirebaseStorage => {
  if (!storageInstance) {
    storageInstance = getFirebaseStorage(firebaseApp)
    if (isDev) connectStorageEmulator(storageInstance, '127.0.0.1', 9199)
  }
  return storageInstance
}

export const functions = (): Functions => {
  if (!functionsInstance) {
    functionsInstance = getFirebaseFunctions(firebaseApp)
    if (isDev) connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001)
  }
  return functionsInstance
}

/**
 * Analytics is fire-and-forget and deliberately lives in its own lazily imported module
 * (`@/analytics`) so the Analytics and Installations SDKs stay out of the initial bundle.
 * Re-exported here for call sites that already import from `@/firebase`.
 */
export async function logAnalyticsEvent(eventName: string, eventParams?: Record<string, unknown>) {
  const { trackEvent } = await import('@/analytics')
  await trackEvent(eventName, eventParams)
}
