import { v4 as uuidv4 } from 'uuid'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { nextTick } from 'vue'
import { CONFIG } from 'src/helpers'
import { auth, db } from 'src/boot/firebase'
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  orderBy,
} from 'firebase/firestore'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import router from 'src/router'
import type { User } from 'firebase/auth'
import type { DeviceType, MyUserType, UsersAndDevices } from 'src/helpers/models'
import type { Firestore, Query } from '@firebase/firestore'
import notify from 'src/helpers/notify'
import { deviceCollection, userCollection } from 'src/helpers/collections'

const provider = new GoogleAuthProvider()
provider.addScope('profile')
provider.addScope('email')

const familyMember = (email: string): boolean => {
  return CONFIG.familyMap.get(email) != undefined
}
const adminMember = (email: string, uid: string): boolean => {
  if (process.env.DEV) {
    return CONFIG.adminMap.get(email) != undefined
  } else {
    return CONFIG.adminMap.get(email) === uid
  }
}

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
      allowPush: false, // from db and state
      askPush: false, // from state
    }
  },
  actions: {
    /**
     * Stores a user in the database.
     *
     * @param {User} user - The user object to store.
     * @return {Promise<void>} A promise that resolves when the user is stored.
     */
    async storeUser(user: User): Promise<void> {
      const userRef = doc(userCollection, user.uid)
      const userSnap = await getDoc(userRef)
      const email = user.email || ''
      const now = new Date()

      if (userSnap.exists()) {
        const data = userSnap.data() as MyUserType
        this.allowPush = data.allowPush

        // If last login (timestamp) is older than loginDays, ask for push again
        const lastLogin = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : 0
        this.askPush = Date.now() - lastLogin > CONFIG.loginDays * 86400000

        data.isAuthorized = familyMember(email)
        data.isAdmin = adminMember(email, user.uid)
        data.timestamp = Timestamp.fromDate(now)
        this.user = data
      } else {
        const nick = CONFIG.familyMap.get(email) || uuidv4().substring(0, 8)
        this.allowPush = false
        this.askPush = false
        this.user = {
          name: user.displayName || '',
          email,
          nick,
          uid: user.uid,
          isAuthorized: familyMember(email),
          isAdmin: adminMember(email, user.uid),
          allowPush: false,
          timestamp: Timestamp.fromDate(now),
        }
      }
      if (this.user) {
        await setDoc(userRef, this.user, { merge: true })
      }
    },

    /**
     * Signs in the user.
     *
     * @return {Promise<void>} A promise that resolves when the user is signed in.
     */
    async signIn(): Promise<void> {
      if (this.user && this.user.uid) {
        await auth.signOut()
        this.user = null
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
            icon: 'error',
          })
        }
      }
    },

    /**
     * Retrieves the list of users from the database.
     *
     * @return {Promise<MyUserType[]>} A promise that resolves to an array of user objects.
     */
    async fetchUsers(): Promise<MyUserType[]> {
      const users: MyUserType[] = []
      const q = query(userCollection, orderBy('email', 'asc'))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          users.push({ ...(d.data() as MyUserType) })
        })
      }
      return users
    },

    /**
     * Retrieves the list of devices from the database.
     *
     * @return {Promise<DeviceType[]>} A promise that resolves to an array of device objects.
     */
    async fetchDevices(): Promise<DeviceType[]> {
      const devices: DeviceType[] = []
      const q = query(deviceCollection, orderBy('timestamp', 'desc'))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          devices.push({ ...(d.data() as DeviceType), key: d.id })
        })
      }
      return devices
    },

    /**
     * Retrieves the list of users and their associated devices from the database.
     *
     * @return {Promise<UsersAndDevices[]>} A promise that resolves to an array of user and device objects.
     */
    async fetchUsersAndDevices() {
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

    async updateUser(user: UsersAndDevices, field: keyof UsersAndDevices): Promise<void> {
      const docRef = doc(userCollection, user.uid)
      try {
        await updateDoc(docRef, {
          [field]: user[field],
        })
        const value = user[field] as string | boolean
        notify({
          message: `Updated ${field} to ${value}`,
          icon: 'check',
        })
      } catch (err) {
        notify({
          type: 'negative',
          message: `Failed to update ${field}: ${String(err)}`,
        })
      }
    },

    /**
     * Updates a user's subscription status in the database.
     *
     * @return {Promise<void>} A promise that resolves when the user's subscription status is updated.
     */
    async updateSubscriber(): Promise<void> {
      const docRef = doc(userCollection, this.user!.uid)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        updateDoc(docRef, {
          allowPush: this.allowPush,
          timestamp: Timestamp.fromDate(new Date()),
        })
      }
    },
    /**
     * Updates a device in the database.
     *
     * @param {string} token - The token of the device to update.
     * @return {Promise<void>} A promise that resolves when the device is updated.
     */
    async updateDevice(token: string): Promise<void> {
      const docRef = doc(deviceCollection, token)
      const snap = await getDoc(docRef)
      if (!snap.exists()) {
        setDoc(docRef, {
          email: this.user!.email,
          timestamp: Timestamp.fromDate(new Date()),
        })
      }
    },

    /**
     * Removes a device from the database.
     *
     * @return {Promise<void>} A promise that resolves when the device is removed.
     */
    removeDevice(): Promise<void> {
      const q = query(deviceCollection, where('email', '==', this.user?.email || ''))
      return new Promise((resolve, reject) => {
        this.deleteQueryBatch(db, q, resolve).catch(reject)
      })
    },

    /**
     * Delete documents matching a query in batches.
     *
     * Delete documents matching a query in batches, to avoid exploding the stack.
     *
     * @param {Firestore} db - The Firestore database.
     * @param {Query} query - The query to match documents with.
     * @param {() => void} resolve - The function to call when all documents are deleted.
     * @return {Promise<void>} A promise that resolves when all documents are deleted.
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

      // If there might be more, continue in next tick
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
