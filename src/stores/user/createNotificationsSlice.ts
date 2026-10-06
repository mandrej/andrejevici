import type { StateCreator } from 'zustand'
import CONFIG from '@/config'
import { getMessagingInstance } from '@/messaging'
import { doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore'
import notify from '@/helpers/notify'
import { getUserDeviceCollection, userCollection } from '@/helpers/collections'
import { deleteUserDevices } from '@/helpers/devices'
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
      doc(getUserDeviceCollection(email), token),
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
    // Every token in this subcollection belongs to the current user, and the browser cannot tell
    // which stored token maps to this device, so unsubscribing clears the whole subcollection.
    await deleteUserDevices(email)
  },
})
