import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import CONFIG from '../config'
import { auth, db, messaging, logAnalyticsEvent } from '../firebase'
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore'
import { getToken } from 'firebase/messaging'
import { signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth'
import type { DeviceType, MyUserType, UsersAndDevices } from '../helpers/models'
import notify from '../helpers/notify'
import { deviceCollection, userCollection } from '../helpers/collections'
import { dummy, formatDatum } from '../helpers'

const provider = new GoogleAuthProvider()
provider.addScope('profile')
provider.addScope('email')

export let resolveAuthReady!: () => void
export const authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve
})

interface UserStore {
  user: MyUserType | null
  token: string | null
  allowPush: boolean
  askPush: boolean
  isFreshLogin: boolean
  storeUser: (user: User) => Promise<void>
  refreshToken: () => Promise<void>
  enableNotifications: () => Promise<void>
  disableNotifications: () => Promise<void>
  signIn: () => Promise<void>
  fetchUsers: () => Promise<MyUserType[]>
  getNickByEmail: (email: string) => Promise<string>
  fetchDevices: () => Promise<DeviceType[]>
  fetchUsersAndDevices: () => Promise<UsersAndDevices[]>
  deleteUser: (uid: string) => Promise<void>
  updateUser: (user: UsersAndDevices, field: keyof UsersAndDevices) => Promise<void>
  updateSubscriber: () => Promise<void>
  updateDevice: (token: string) => Promise<void>
  removeDevice: () => Promise<void>
  clearAuth: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      allowPush: false,
      askPush: false,
      isFreshLogin: false,

      storeUser: async (user: User) => {
        const userRef = doc(userCollection, user.uid)
        const userSnap = await getDoc(userRef)
        const email = user.email || ''
        const now = Timestamp.fromDate(new Date())

        if (userSnap.exists()) {
          const data = userSnap.data() as MyUserType
          const lastLogin = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : 0
          const isExpired = Date.now() - lastLogin > CONFIG.loginDays * 86400000

          if (isExpired && !get().isFreshLogin) {
            await auth.signOut()
            get().clearAuth()
            resolveAuthReady()
            return
          }

          const askPush = isExpired
          if (get().isFreshLogin) {
            logAnalyticsEvent('sign_in', {
              text: 'existing fresh',
              when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
              who: email ? dummy(email) : 'anonymous',
            })
          }

          data.timestamp = now
          set({
            user: data,
            allowPush: data.allowPush,
            askPush,
            isFreshLogin: false,
          })
        } else {
          const isFirstUser = (await getDocs(query(userCollection, limit(1)))).empty
          const allowPush = isFirstUser
          const askPush = isFirstUser

          logAnalyticsEvent('sign_in', {
            text: 'new user',
            when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
            who: email ? dummy(email) : 'anonymous',
          })

          const newUser: MyUserType = {
            name: user.displayName || '',
            email,
            nick: isFirstUser ? 'admin' : dummy(email),
            uid: user.uid,
            isAuthorized: isFirstUser,
            isAdmin: isFirstUser,
            allowPush: isFirstUser,
            timestamp: now,
          }

          set({
            user: newUser,
            allowPush,
            askPush,
            isFreshLogin: false,
          })
        }

        const currentUser = get().user
        if (currentUser) {
          await setDoc(userRef, currentUser, { merge: true })
        }
        resolveAuthReady()
      },

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

      signIn: async () => {
        const currentUser = get().user
        if (currentUser?.uid) {
          await auth.signOut()
          get().clearAuth()
          // We will handle routing to '/' inside components
        } else {
          try {
            set({ isFreshLogin: true })
            const result = await signInWithPopup(auth, provider)
            if (process.env.NODE_ENV === 'development') {
              console.log(`Auth user: ${result.user.displayName}`)
            }
          } catch (err) {
            set({ isFreshLogin: false })
            notify({
              type: 'negative',
              message: 'An error occurred during sign-in. ' + String(err),
              icon: 'sym_r_error',
            })
          }
        }
      },

      fetchUsers: async () => {
        const snapshot = await getDocs(query(userCollection, orderBy('email', 'asc')))
        return snapshot.docs.map((d) => d.data() as MyUserType)
      },

      getNickByEmail: async (email: string) => {
        const q = query(userCollection, where('email', '==', email), limit(1))
        const snapshot = await getDocs(q)
        if (snapshot.empty || !snapshot.docs[0]) {
          throw new Error(`User with email ${email} not found`)
        }
        const data = snapshot.docs[0].data() as MyUserType
        if (!data.nick) {
          throw new Error(`User with email ${email} has no nickname`)
        }
        return data.nick
      },

      fetchDevices: async () => {
        const snapshot = await getDocs(query(deviceCollection, orderBy('timestamp', 'desc')))
        return snapshot.docs.map((d) => ({ ...(d.data() as DeviceType), key: d.id }))
      },

      fetchUsersAndDevices: async () => {
        const [devices, users] = await Promise.all([get().fetchDevices(), get().fetchUsers()])

        const deviceMap = new Map<string, Timestamp[]>()
        for (const dev of devices) {
          const list = deviceMap.get(dev.email)
          if (list) {
            list.push(dev.timestamp)
          } else {
            deviceMap.set(dev.email, [dev.timestamp])
          }
        }

        return users.map((user) => ({
          ...user,
          timestamps: deviceMap.get(user.email) ?? [],
        }))
      },

      deleteUser: async (uid: string) => {
        try {
          await deleteDoc(doc(userCollection, uid))
          notify({ message: 'User deleted', icon: 'sym_r_delete' })
        } catch (err) {
          notify({
            type: 'negative',
            message: `Failed to delete user: ${String(err)}`,
          })
        }
      },

      updateUser: async (user: UsersAndDevices, field: keyof UsersAndDevices) => {
        const docRef = doc(userCollection, user.uid)
        try {
          await updateDoc(docRef, { [field]: user[field] })
          const value = user[field] as string | boolean
          notify({ message: `Updated ${String(field)} to ${value}`, icon: 'sym_r_check' })
        } catch (err) {
          notify({
            type: 'negative',
            message: `Failed to update ${String(field)}: ${String(err)}`,
          })
        }
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

      clearAuth: () => {
        set({
          user: null,
          token: null,
          allowPush: false,
          askPush: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user ? { uid: state.user.uid } : null,
        token: state.token,
      }),
    },
  ),
)
