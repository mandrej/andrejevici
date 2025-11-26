import uuid4 from 'uuid4'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { nextTick } from 'vue'
import { CONFIG } from 'src/helpers'
import { auth, db } from 'src/lib/firebase'
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
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { useValuesStore } from './values'
import router from 'src/router'
import type { User } from 'firebase/auth'
import type { DeviceType, MyUserType, UsersAndDevices } from 'src/helpers/models'
import type { Firestore, Query } from '@firebase/firestore'
import notify from 'src/helpers/notify'
import { deviceCollection, userCollection } from 'src/helpers/collections'

const provider = new GoogleAuthProvider()
provider.addScope('profile')
provider.addScope('email')

// const familyMember = (email: string): boolean => {
//   return nickInsteadEmail(email) != undefined
// }
// const adminMember = (email: string, uid: string): boolean => {
//   if (process.env.DEV) {
//     return CONFIG.adminMap.get(email) != undefined
//   } else {
//     return CONFIG.adminMap.get(email) === uid
//   }
// }

export const useUserStore = defineStore('auth', {
  state(): {
    user: MyUserType | null
    token: string | null
    allowPush: boolean
    askPush: boolean
    emailNickMap: Map<string, string>
  } {
    return {
      user: null,
      token: null,
      allowPush: false,
      askPush: false,
      emailNickMap: new Map<string, string>(),
    }
  },
  actions: {
    // TODO remove this when all users have uid
    getEmailNickMap(): void {
      this.emailNickMap = CONFIG.familyMap
    },
    // async getEmailNickMap(): Promise<void> {
    //   const users = await this.fetchUsers()
    //   // The persisted state plugin serializes Maps to plain objects. Ensure we
    //   // have a real Map instance before calling .set on it.
    //   if (!(this.emailNickMap instanceof Map)) {
    //     try {
    //       // Convert plain object to Map; if it's null/undefined, start fresh
    //       const obj = this.emailNickMap as unknown as Record<string, string> | null
    //       this.emailNickMap = obj ? new Map(Object.entries(obj)) : new Map<string, string>()
    //     } catch {
    //       // Fallback: create a new Map
    //       this.emailNickMap = new Map<string, string>()
    //     }
    //   }

    //   users.forEach((user) => {
    //     this.emailNickMap.set(user.email, user.nick)
    //   })
    // },

    /**
     * Stores a user in the database.
     *
     * @param {User} user - The user object to store.
     * @return {Promise<void>} A promise that resolves when the user is stored.
     */
    async storeUser(user: User): Promise<void> {
      const meta = useValuesStore()
      const userRef = doc(userCollection, user.uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const data = userSnap.data() as MyUserType
        this.allowPush = data.allowPush
        const diff =
          Date.now() - (data?.timestamp instanceof Timestamp ? data.timestamp.toMillis() : 0)
        if (diff > CONFIG.loginDays * 86400000) {
          this.askPush = true
        }
        this.askPush = false
        this.user = data
      } else {
        // TODO if user had contributions
        const nick = meta.emailValues.includes(user.email || '')
          ? this.emailNickMap.get(user.email || '')
          : user.email?.match(/[^.@]+/)?.[0] || 'anonymous'
        this.allowPush = false
        this.user = {
          name: user.displayName || '',
          email: user.email || '',
          nick: nick || uuid4().substring(0, 8),
          uid: user.uid,
          isAuthorized: false,
          isAdmin: false,
          allowPush: false,
          timestamp: Timestamp.fromDate(new Date()),
        }
      }
      await setDoc(userRef, this.user, { merge: true })
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
          const result = await signInWithPopup(getAuth(), provider)
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
      const result: UsersAndDevices[] = []
      const devices: DeviceType[] = await this.fetchDevices()
      const users: MyUserType[] = await this.fetchUsers()

      users.forEach((user) => {
        result.push({
          ...user,
          timestamps: devices
            .filter((dev) => dev.email === user.email)
            .map((dev) => dev.timestamp as Timestamp),
        })
      })
      return result
    },

    /**
     * Updates a user's field in the database.
     *
     * @param {UsersAndDevices} user - The user object to update.
     * @param {string} field - The field to update.
     * @return {Promise<void>} A promise that resolves when the user is updated.
     */
    async updateUser(user: UsersAndDevices, field: string): Promise<void> {
      const docRef = doc(userCollection, user.uid)
      await updateDoc(docRef, {
        [field]: user[field as keyof UsersAndDevices], // dynamc field
      })

      const value = user[field as keyof UsersAndDevices] as string | boolean
      const message = `User ${user.email} has updated ${field} to ${value}`
      notify({
        message: message,
        icon: 'check',
      })
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
        await updateDoc(docRef, {
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
        await setDoc(docRef, {
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
      const batchSize = querySnapshot.size
      if (batchSize === 0) {
        resolve()
        return
      }

      const batch = writeBatch(db)
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      nextTick(() => {
        void this.deleteQueryBatch(db, query, resolve)
      })
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}
