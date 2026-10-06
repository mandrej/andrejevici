import type { StateCreator } from 'zustand'
import CONFIG from '@/config'
import { db } from '@/firebase'
import { getMessagingInstance } from '@/messaging'
import {
  doc,
  setDoc,
  getDocs,
  updateDoc,
  collection,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import notify from '@/helpers/notify'
import { userCollection } from '@/helpers/collections'
import type {
  UserStore,
  NotificationsSliceState,
  NotificationsSliceActions,
} from '@/stores/user/types'

export const createNotificationsSlice: StateCreator<
  UserStore,
  [],
  [],
  NotificationsSliceState & NotificationsSliceActions
> = (set, get) => ({
  token: null,
  allowPush: false,
  askPush: false,

  refreshToken: async () => {
    try {
      const messaging = await getMessagingInstance()
      if (!messaging) return
      const { getToken } = await import('firebase/messaging')
      const token = await getToken(messaging as Parameters<typeof getToken>[0], {
        vapidKey: CONFIG.firebase.vapidKey,
      })
      if (token) {
        set({ token })
        await get().updateDevice(token)
      } else {
        set({ askPush: true })
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('FCM token refresh failed:', err)
      }
    }
  },

  enableNotifications: async () => {
    try {
      const permission = await Notification.requestPermission()

      if (permission === 'granted') {
        const messaging = await getMessagingInstance()
        if (!messaging) return
        const { getToken } = await import('firebase/messaging')
        const token = await getToken(messaging as Parameters<typeof getToken>[0], {
          vapidKey: CONFIG.firebase.vapidKey,
        })

        if (token) {
          set({ token, askPush: false, allowPush: true })
          await Promise.all([get().updateSubscriber(), get().updateDevice(token)])
        } else {
          notify({
            type: 'negative',
            multiLine: true,
            message: 'Unable to retrieve notification token. Please try again.',
          })
        }
      } else if (permission === 'denied') {
        await get().disableNotifications()
        notify({
          type: 'warning',
          message: 'Notifications denied. You can enable them later in browser settings.',
        })
      }
    } catch (err) {
      console.error('Error enabling notifications:', err)
      await get().disableNotifications()
      notify({
        type: 'negative',
        message: 'Failed to enable notifications. Please try again.',
      })
    }
  },

  disableNotifications: async () => {
    set({ askPush: false, allowPush: false })
    await Promise.all([get().updateSubscriber(), get().removeDevice()])
  },

  updateSubscriber: async () => {
    const currentUser = get().user
    if (!currentUser?.id) return
    await updateDoc(doc(userCollection(), currentUser.id), {
      allowPush: get().allowPush,
      timestamp: Timestamp.fromDate(new Date()),
    })
  },

  updateDevice: async (token: string) => {
    const currentUser = get().user
    const email = currentUser?.email?.trim().toLowerCase()
    if (!email) return
    await setDoc(
      doc(db(), 'User', email, 'Device', token),
      {
        timestamp: Timestamp.fromDate(new Date()),
      },
      { merge: true },
    )
  },

  removeDevice: async () => {
    const currentUser = get().user
    const email = currentUser?.email?.trim().toLowerCase()
    if (!email) return
    const deviceSubcollection = collection(db(), 'User', email, 'Device')
    let snapshot = await getDocs(deviceSubcollection)

    while (!snapshot.empty) {
      const batch = writeBatch(db())
      snapshot.forEach((d) => batch.delete(d.ref))
      await batch.commit()
      if (snapshot.size < 500) break
      snapshot = await getDocs(deviceSubcollection)
    }
  },
})
