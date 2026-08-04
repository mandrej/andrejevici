import type { StateCreator } from 'zustand'
import CONFIG from '@/config'
import { messaging, db } from '@/firebase'
import {
  doc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { getToken } from 'firebase/messaging'
import notify from '@/helpers/notify'
import { deviceCollection, userCollection } from '@/helpers/collections'
import type { UserStore, NotificationsSliceState, NotificationsSliceActions } from '@/stores/user/types'

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
      if (!messaging) return
      const token = await getToken(messaging, {
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
        if (!messaging) return
        const token = await getToken(messaging, {
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
    if (!currentUser?.uid) return
    await updateDoc(doc(userCollection, currentUser.uid), {
      allowPush: get().allowPush,
      timestamp: Timestamp.fromDate(new Date()),
    })
  },

  updateDevice: async (token: string) => {
    const currentUser = get().user
    if (!currentUser?.email) return
    await setDoc(
      doc(deviceCollection, token),
      {
        email: currentUser.email,
        timestamp: Timestamp.fromDate(new Date()),
      },
      { merge: true },
    )
  },

  removeDevice: async () => {
    const currentUser = get().user
    const q = query(deviceCollection, where('email', '==', currentUser?.email || ''))
    let snapshot = await getDocs(q)

    while (!snapshot.empty) {
      const batch = writeBatch(db)
      snapshot.forEach((d) => batch.delete(d.ref))
      await batch.commit()
      if (snapshot.size < 500) break
      snapshot = await getDocs(q)
    }
  },
})
