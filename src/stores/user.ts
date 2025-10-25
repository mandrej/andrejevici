import { defineStore, acceptHMRUpdate } from 'pinia'
import { nextTick } from 'vue'
import { CONFIG } from '../helpers'
import { auth, db } from '../lib/firebase'
import {
  doc,
  collection,
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
import router from '../router'
import type { User } from 'firebase/auth'
import type { DeviceType, MyUserType, UsersAndDevices } from '../helpers/models'
import type { Firestore, Query } from '@firebase/firestore'
import notify from '../helpers/notify'

const provider = new GoogleAuthProvider()
provider.addScope('profile')
provider.addScope('email')

const deviceCol = collection(db, 'Device')
const userCol = collection(db, 'User')

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
    async getEmailNickMap(): Promise<void> {
      const users = await this.fetchUsers()
      // The persisted state plugin serializes Maps to plain objects. Ensure we
      // have a real Map instance before calling .set on it.
      if (!(this.emailNickMap instanceof Map)) {
        try {
          // Convert plain object to Map; if it's null/undefined, start fresh
          const obj = this.emailNickMap as unknown as Record<string, string> | null
          this.emailNickMap = obj ? new Map(Object.entries(obj)) : new Map<string, string>()
        } catch {
          // Fallback: create a new Map
          this.emailNickMap = new Map<string, string>()
        }
      }

      users.forEach((user) => {
        this.emailNickMap.set(user.email, user.nick)
      })
    },

    async storeUser(user: User): Promise<void> {
      const userRef = doc(db, 'User', user.uid)
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
        this.allowPush = false
        this.user = {
          name: user.displayName || '',
          email: user.email || '',
          // TODO set unique nick
          nick: user.email?.match(/[^.@]+/)?.[0] || 'anonymous',
          uid: user.uid,
          isAuthorized: false,
          isAdmin: false,
          allowPush: false,
          timestamp: Timestamp.fromDate(new Date()),
        }
      }
      await setDoc(userRef, this.user, { merge: true })
    },

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

    async updateUser(): Promise<void> {
      // TODO build form for user
      const docRef = doc(db, 'User', this.user!.uid)
      if (this.user) {
        await updateDoc(docRef, this.user)
      }
    },

    async fetchUsers(): Promise<MyUserType[]> {
      const users: MyUserType[] = []
      const q = query(userCol, orderBy('email', 'asc'))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          users.push({ ...(d.data() as MyUserType) })
        })
      }
      return users
    },

    async fetchDevices(): Promise<DeviceType[]> {
      const devices: DeviceType[] = []
      const q = query(deviceCol, orderBy('timestamp', 'desc'))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          devices.push({ ...(d.data() as DeviceType), key: d.id })
        })
      }
      return devices
    },

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

    // async removeSubscriber(subscribersAndDevices: UsersAndDevices): Promise<void> {
    //   const docRef = doc(db, 'Subscriber', subscribersAndDevices.key)
    //   await deleteDoc(docRef)
    //   notify({
    //     message: `Subscriber ${subscribersAndDevices.email} removed`,
    //     icon: 'check',
    //   })
    // },

    async toggleAllowPush(user: UsersAndDevices): Promise<void> {
      const docRef = doc(db, 'User', user.uid)
      const settings = user.allowPush
      await updateDoc(docRef, {
        allowPush: settings,
      })
      notify({
        message: `Subscriber ${user.email} allowPush set to ${settings}`,
        icon: 'check',
      })
    },
    async toggleEdit(user: UsersAndDevices): Promise<void> {
      const docRef = doc(db, 'User', user.uid)
      const settings = user.isAuthorized
      await updateDoc(docRef, {
        isAuthorized: settings,
      })
      notify({
        message: `User ${user.email} has editor role set to ${settings}`,
        icon: 'check',
      })
    },
    async toggleAdmin(user: UsersAndDevices): Promise<void> {
      const docRef = doc(db, 'User', user.uid)
      const settings = user.isAdmin
      await updateDoc(docRef, {
        isAdmin: settings,
      })
      notify({
        message: `User ${user.email} has admin role set to ${settings}`,
        icon: 'check',
      })
    },
    async changeNick(user: UsersAndDevices): Promise<void> {
      const docRef = doc(db, 'User', user.uid)
      const settings = user.nick
      await updateDoc(docRef, {
        nick: settings,
      })
      notify({
        message: `User ${user.email} change nick name to ${settings}`,
        icon: 'check',
      })
    },

    async updateSubscriber(): Promise<void> {
      const docRef = doc(db, 'User', this.user!.uid)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        await updateDoc(docRef, {
          allowPush: this.allowPush,
          timestamp: Timestamp.fromDate(new Date()),
        })
      }
    },
    async updateDevice(token: string): Promise<void> {
      const docRef = doc(db, 'Device', token)
      const snap = await getDoc(docRef)
      if (!snap.exists()) {
        await setDoc(docRef, {
          email: this.user!.email,
          timestamp: Timestamp.fromDate(new Date()),
        })
      }
    },
    /**
     * Remove the user's device token from Firestore.
     *
     * Removes the user's device token from Firestore.
     *
     * @return {Promise<void>} Promise that resolves when the device token is removed.
     */
    removeDevice(): Promise<void> {
      const q = query(deviceCol, where('email', '==', this.user?.email || ''))
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
