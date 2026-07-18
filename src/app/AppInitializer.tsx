'use client'

import React, { useEffect } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { onMessage } from 'firebase/messaging'
import { resolveAuthReady, useUserStore } from '../stores/userStore'
import { useAppStore } from '../stores/appStore'
import { useValuesStore } from '../stores/valuesStore'
import { useBucketStore } from '../stores/bucketStore'
import { messaging } from '../firebase'
import notify from '../helpers/notify'

interface AppInitializerProps {
  children: React.ReactNode
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const storeUser = useUserStore((state) => state.storeUser)
  const clearAuth = useUserStore((state) => state.clearAuth)
  const allowPush = useUserStore((state) => state.allowPush)
  const refreshToken = useUserStore((state) => state.refreshToken)

  useEffect(() => {
    // Reset state and run fetchers
    const appStore = useAppStore.getState()
    const bucketStore = useBucketStore.getState()
    const valuesStore = useValuesStore.getState()

    appStore.initTheme()
    appStore.setBusy(false)
    appStore.setError('')
    appStore.setShowEdit(false)
    appStore.setShowConfirm(false)
    appStore.setShowCarousel(false)

    void Promise.all([
      appStore.fetchLastRec(),
      bucketStore.fetchBucket(),
      valuesStore.fetchValues(),
    ])

    // Auth state listener
    const unsubscribeAuth = onAuthStateChanged(getAuth(), (usr) => {
      if (usr) {
        storeUser(usr)
          .then(() => {
            if (useUserStore.getState().allowPush) {
              void refreshToken()
            }
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

    return () => {
      unsubscribeAuth()
      if (unsubscribeMessaging) unsubscribeMessaging()
    }
  }, [storeUser, clearAuth, allowPush, refreshToken])

  return <>{children}</>
}

export default AppInitializer
