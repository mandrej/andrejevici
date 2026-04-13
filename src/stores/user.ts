import { defineStore, acceptHMRUpdate } from 'pinia'
import { nextTick } from 'vue'
import CONFIG from '../config'
import { auth, db, messaging } from '../firebase'
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
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import router from '../router'
import type { User } from 'firebase/auth'
import type { DeviceType, MyUserType, UsersAndDevices } from '../helpers/models'
import type { Firestore, Query } from '@firebase/firestore'
import notify from '../helpers/notify'
import { deviceCollection, userCollection } from '../helpers/collections'

const provider = new GoogleAuthProvider()
provider.addScope('profile')
provider.addScope('email')

/**
 * Resolves once the very first Firebase auth state has been fully processed
 * (including the Firestore user lookup in storeUser, or the sign-out branch).
 * The router guard awaits this before checking isAdmin / isAuthorized.
 */
export let resolveAuthReady!: () => void
export const authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve
})

export const useUserStore = defineStore('auth', {
  state(): {
    user: MyUserType | null
    token: string | null
    allowPush: boolean
    askPush: boolean
  } {
    return {
      user: null,
      token: null,
      allowPush: false, // persisted in db
      askPush: false, // ephemeral — show consent dialog
    }
  },
  persist: {
    pick: ['user.email', 'token'],
    omit: [
      'user.uid',
      'user.name',
      'user.nick',
      'user.isAuthorized',
      'user.isAdmin',
      'user.allowPush',
      'user.timestamp',
      'allowPush',
      'askPush',
    ],
  },

  actions: {
    /**
     * Stores a user in Firestore after sign-in or token refresh.
     * Sets allowPush and askPush from the stored user record.
     */
    async storeUser(user: User): Promise<void> {
      const userRef = doc(userCollection, user.uid)
      const userSnap = await getDoc(userRef)
      const email = user.email || ''
      const now = new Date()

      if (userSnap.exists()) {
        const data = userSnap.data() as MyUserType
        this.allowPush = data.allowPush

        // If last login is older than loginDays, prompt for push consent again
        const lastLogin = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : 0
        this.askPush = Date.now() - lastLogin > CONFIG.loginDays * 86400000

        data.timestamp = Timestamp.fromDate(now)
        this.user = data
      } else {
        // Check if this is the first user EVER
        const q = query(userCollection, limit(1))
        const allUsersSnap = await getDocs(q)
        const isFirstUser = allUsersSnap.empty

        const nick = isFirstUser ? 'admin' : ''
        this.allowPush = isFirstUser
        this.askPush = isFirstUser
        this.user = {
          name: user.displayName || '',
          email,
          nick,
          uid: user.uid,
          isAuthorized: isFirstUser,
          isAdmin: isFirstUser,
          allowPush: isFirstUser,
          timestamp: Timestamp.fromDate(now),
        }
      }

      await setDoc(userRef, this.user, { merge: true })
      resolveAuthReady()
    },

    /**
     * Silently retrieves the FCM token for an already-consented user.
     * Called after sign-in when allowPush is already true.
     * Sets askPush = true if no token is available (e.g. token expired).
     */
    async refreshToken(): Promise<void> {
      try {
        const registration = await navigator.serviceWorker?.getRegistration()
        const token = await getToken(messaging, {
          vapidKey: CONFIG.firebase.vapidKey,
          ...(registration ? { serviceWorkerRegistration: registration } : {}),
        })
        if (token) {
          this.token = token
          await this.updateDevice(token)
        } else {
          // Token not available — prompt the user again
          this.askPush = true
        }
      } catch (err) {
        if (process.env.DEV) console.warn('FCM token refresh failed:', err)
        // Don't surface this as an error to the user — it's a background operation
      }
    },

    /**
     * Requests notification permission from the browser and registers the FCM token.
     */
    async enableNotifications(): Promise<void> {
      try {
        const permission = await Notification.requestPermission()

        if (permission === 'granted') {
          const token = await getToken(messaging, {
            vapidKey: CONFIG.firebase.vapidKey,
          })

          if (token) {
            this.token = token
            this.askPush = false
            this.allowPush = true
            await Promise.all([this.updateSubscriber(), this.updateDevice(token)])
          } else {
            notify({
              type: 'negative',
              multiLine: true,
              message: 'Unable to retrieve notification token. Please try again.',
            })
          }
        } else if (permission === 'denied') {
          this.askPush = false
          this.allowPush = false
          await this.updateSubscriber()
          notify({
            type: 'warning',
            message: 'Notifications denied. You can enable them later in browser settings.',
          })
        }
      } catch (err) {
        console.error('Error enabling notifications:', err)
        this.askPush = false
        this.allowPush = false
        await this.updateSubscriber()
        notify({
          type: 'negative',
          message: 'Failed to enable notifications. Please try again.',
        })
      }
    },

    /**
     * Disables push notifications for this user and removes their device token.
     */
    async disableNotifications(): Promise<void> {
      this.askPush = false
      this.allowPush = false
      await Promise.all([this.updateSubscriber(), this.removeDevice()])
    },

    /**
     * Signs the user in via Google popup, or signs them out if already signed in.
     */
    async signIn(): Promise<void> {
      if (this.user?.uid) {
        await auth.signOut()
        this.user = null
        this.token = null
        this.askPush = false
        this.allowPush = false
        void router.push({ name: 'home' })
      } else {
        try {
          const result = await signInWithPopup(auth, provider)
          if (process.env.DEV) console.log(`Auth user: ${result.user.displayName}`)
        } catch (err) {
          notify({
            type: 'negative',
            message: 'An error occurred during sign-in. ' + String(err),
            icon: 'sym_r_error',
          })
        }
      }
    },

    /**
     * Retrieves all users from Firestore, ordered by email.
     */
    async fetchUsers(): Promise<MyUserType[]> {
      const users: MyUserType[] = []
      const q = query(userCollection, orderBy('email', 'asc'))
      const snapshot = await getDocs(q)
      snapshot.forEach((d) => {
        users.push({ ...(d.data() as MyUserType) })
      })
      return users
    },

    /**
     * Finds a nickname by email from the users collection.
     */
    async getNickByEmail(email: string): Promise<string> {
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

    /**
     * Retrieves all registered devices from Firestore, ordered by timestamp descending.
     */
    async fetchDevices(): Promise<DeviceType[]> {
      const devices: DeviceType[] = []
      const q = query(deviceCollection, orderBy('timestamp', 'desc'))
      const snapshot = await getDocs(q)
      snapshot.forEach((d) => {
        devices.push({ ...(d.data() as DeviceType), key: d.id })
      })
      return devices
    },

    /**
     * Retrieves all users joined with their registered device timestamps.
     */
    async fetchUsersAndDevices(): Promise<UsersAndDevices[]> {
      const [devices, users] = await Promise.all([this.fetchDevices(), this.fetchUsers()])

      const deviceMap: Record<string, Timestamp[]> = {}
      devices.forEach((dev) => {
        if (!deviceMap[dev.email]) deviceMap[dev.email] = []
        deviceMap[dev.email]!.push(dev.timestamp as Timestamp)
      })

      return users.map((user) => ({
        ...user,
        timestamps: deviceMap[user.email] || [],
      }))
    },

    /**
     * Updates a single field on a user document in Firestore.
     */
    async deleteUser(uid: string): Promise<void> {
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

    /**
     * Updates a single field on a user document in Firestore.
     */
    async updateUser(user: UsersAndDevices, field: keyof UsersAndDevices): Promise<void> {
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

    /**
     * Persists the current allowPush state to the user's Firestore document.
     */
    async updateSubscriber(): Promise<void> {
      if (!this.user?.uid) return
      const docRef = doc(userCollection, this.user.uid)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        await updateDoc(docRef, {
          allowPush: this.allowPush,
          timestamp: Timestamp.fromDate(new Date()),
        })
      }
    },

    /**
     * Upserts a device token in Firestore.
     * Creates the document if it doesn't exist, otherwise refreshes its timestamp.
     */
    async updateDevice(token: string): Promise<void> {
      if (!this.user?.email) return
      const docRef = doc(deviceCollection, token)
      const snap = await getDoc(docRef)
      if (!snap.exists()) {
        await setDoc(docRef, {
          email: this.user.email,
          timestamp: Timestamp.fromDate(new Date()),
        })
      }
    },

    /**
     * Removes all device tokens associated with the current user from Firestore.
     */
    removeDevice(): Promise<void> {
      const q = query(deviceCollection, where('email', '==', this.user?.email || ''))
      return new Promise((resolve, reject) => {
        this.deleteQueryBatch(db, q, resolve).catch(reject)
      })
    },

    /**
     * Deletes documents matching a query in batches of up to 500.
     */
    async deleteQueryBatch(db: Firestore, query: Query, resolve: () => void): Promise<void> {
      const querySnapshot = await getDocs(query)
      if (querySnapshot.empty) {
        resolve()
        return
      }

      const batch = writeBatch(db)
      querySnapshot.forEach((doc) => batch.delete(doc.ref))
      await batch.commit()

      if (querySnapshot.size >= 500) {
        nextTick(() => void this.deleteQueryBatch(db, query, resolve))
      } else {
        resolve()
      }
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}
