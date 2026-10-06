'use client'

import React, { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { onSnapshot, doc, Timestamp } from 'firebase/firestore'
import { resolveAuthReady, useUserStore } from '@/stores/userStore'
import { useAppStore } from '@/stores/appStore'
import { useValuesStore } from '@/stores/valuesStore'
import { useBucketStore } from '@/stores/bucketStore'
import { auth } from '@/firebase'
import { userCollection } from '@/helpers/collections'
import type { MyUserType } from '@/helpers/models'
import CONFIG from '@/config'
import notify from '@/helpers/notify'

interface AppInitializerProps {
  children: React.ReactNode
}

/**
 * Runs background work at a moment when it cannot compete with the first paint.
 */
const whenIdle = (task: () => void, timeout = 3000) => {
  if (typeof window === 'undefined') return
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(task, { timeout })
  } else {
    window.setTimeout(task, 1000)
  }
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const storeUser = useUserStore((state) => state.storeUser)
  const clearAuth = useUserStore((state) => state.clearAuth)

  useEffect(() => {
    // Reset state and run fetchers
    const appStore = useAppStore.getState()
    const bucketStore = useBucketStore.getState()
    const valuesStore = useValuesStore.getState()

    appStore.setBusy(false)
    appStore.setError('')
    appStore.setShowEdit(false)
    appStore.setShowConfirm(false)
    appStore.setShowCarousel(false)

    void Promise.all([bucketStore.fetchBucket(), valuesStore.fetchValues()])

    // Auth state listener
    let unsubscribeUserSnapshot: (() => void) | undefined
    const unsubscribeAuth = onAuthStateChanged(auth(), (usr) => {
      if (unsubscribeUserSnapshot) {
        unsubscribeUserSnapshot()
        unsubscribeUserSnapshot = undefined
      }

      if (usr) {
        storeUser(usr)
          .then(() => {
            const email = (usr.email || '').trim().toLowerCase()
            const userRef = doc(userCollection(), email)
            unsubscribeUserSnapshot = onSnapshot(userRef, async (snap) => {
              if (!snap.exists()) {
                await auth().signOut()
                clearAuth()
                return
              }
              const data = snap.data() as MyUserType
              const lastLogin = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : 0
              const isExpired = !lastLogin || Date.now() - lastLogin > CONFIG.loginDays * 86400000

              if (isExpired && !useUserStore.getState().isFreshLogin) {
                await auth().signOut()
                clearAuth()
                notify({
                  type: 'warning',
                  message: 'Your session has expired. Please sign in again.',
                })
                return
              }

              useUserStore.setState({
                user: { ...data, id: data.id || email },
                allowPush: data.allowPush,
              })

              if (data.allowPush && !useUserStore.getState().token) {
                void useUserStore.getState().refreshToken()
              }
            })
          })
          .catch((err) => {
            console.error('Error storing user:', err)
          })
      } else {
        clearAuth()
        resolveAuthReady()
      }
    })

    // FCM foreground handler. The Messaging and Installations SDKs are only useful to a
    // signed-in user who allows push, and are fetched once the page is idle so they never
    // compete with the first paint.
    let unsubscribeMessaging: (() => void) | undefined

    const setupForegroundMessages = () => {
      whenIdle(() => {
        void import('@/messaging')
          .then((mod) => mod.subscribeForegroundMessages())
          .then((unsubscribe) => {
            unsubscribeMessaging = unsubscribe
          })
          .catch((err) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('FCM foreground handler unavailable:', err)
            }
          })
      })
    }

    const unsubscribeAllowPush = useUserStore.subscribe((state, previous) => {
      if (state.allowPush && !previous.allowPush) setupForegroundMessages()
    })

    if (useUserStore.getState().allowPush) setupForegroundMessages()

    // Register PWA service worker in production or if explicitly enabled in dev
    const isPwaEnabled =
      process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_PWA_DEV === 'true'

    if (isPwaEnabled && 'serviceWorker' in navigator) {
      whenIdle(() => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('Service worker registered successfully:', reg.scope)
          })
          .catch((err) => {
            console.error('Service worker registration failed:', err)
          })
      })
    }

    const unsubscribeLastRec = appStore.subscribeLastRec()

    return () => {
      unsubscribeAuth()
      unsubscribeAllowPush()
      if (unsubscribeUserSnapshot) unsubscribeUserSnapshot()
      if (unsubscribeMessaging) unsubscribeMessaging()
      if (unsubscribeLastRec) unsubscribeLastRec()
    }
  }, [storeUser, clearAuth])

  return <>{children}</>
}

export default AppInitializer
