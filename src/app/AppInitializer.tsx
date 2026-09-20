'use client'

import React, { useEffect } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { onMessage } from 'firebase/messaging'
import { onSnapshot, doc, Timestamp } from 'firebase/firestore'
import { resolveAuthReady, useUserStore } from '@/stores/userStore'
import { useAppStore } from '@/stores/appStore'
import { useValuesStore } from '@/stores/valuesStore'
import { useBucketStore } from '@/stores/bucketStore'
import { auth, messaging } from '@/firebase'
import { userCollection } from '@/helpers/collections'
import type { MyUserType } from '@/helpers/models'
import CONFIG from '@/config'
import notify from '@/helpers/notify'

interface AppInitializerProps {
  children: React.ReactNode
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
    const unsubscribeAuth = onAuthStateChanged(getAuth(), (usr) => {
      if (unsubscribeUserSnapshot) {
        unsubscribeUserSnapshot()
        unsubscribeUserSnapshot = undefined
      }

      if (usr) {
        storeUser(usr)
          .then(() => {
            const userRef = doc(userCollection, usr.uid)
            unsubscribeUserSnapshot = onSnapshot(userRef, async (snap) => {
              if (!snap.exists()) {
                await auth.signOut()
                clearAuth()
                return
              }
              const data = snap.data() as MyUserType
              const lastLogin = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : 0
              const isExpired = !lastLogin || Date.now() - lastLogin > CONFIG.loginDays * 86400000

              if (isExpired && !useUserStore.getState().isFreshLogin) {
                await auth.signOut()
                clearAuth()
                notify({
                  type: 'warning',
                  message: 'Your session has expired. Please sign in again.',
                })
                return
              }

              useUserStore.setState({
                user: data,
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

    // FCM messaging handler
    let unsubscribeMessaging: (() => void) | undefined
    if (messaging) {
      unsubscribeMessaging = onMessage(messaging, (payload) => {
        console.log('FCM message received:', payload)
        const body = payload.data?.body || payload.notification?.body
        if (body) {
          notify({
            type: 'external',
            message: body,
            icon: 'sym_r_notifications',
            caption: payload.data?.title || payload.notification?.title || payload.messageId,
          })
        }
      })
    }

    // Register PWA service worker in production or if explicitly enabled in dev
    const isPwaEnabled =
      process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_PWA_DEV === 'true'

    if (isPwaEnabled && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('Service worker registered successfully:', reg.scope)
          })
          .catch((err) => {
            console.error('Service worker registration failed:', err)
          })
      }

      if (document.readyState === 'complete') {
        registerSW()
      } else {
        window.addEventListener('load', registerSW)
      }
    }

    const unsubscribeLastRec = appStore.subscribeLastRec()

    return () => {
      unsubscribeAuth()
      if (unsubscribeUserSnapshot) unsubscribeUserSnapshot()
      if (unsubscribeMessaging) unsubscribeMessaging()
      if (unsubscribeLastRec) unsubscribeLastRec()
    }
  }, [storeUser, clearAuth])

  return <>{children}</>
}

export default AppInitializer
