import { defineStore, acceptHMRUpdate } from 'pinia'
import { nextTick } from 'vue'
import { CONFIG, nickInsteadEmail } from '../helpers'
import { auth, db } from '../boot/fire'
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
} from 'firebase/firestore'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import router from '../router'
import type { User } from 'firebase/auth'
import type { MyUserType, SubscriberType } from '../helpers/models'
import type { Firestore, Query } from '@firebase/firestore'

const provider = new GoogleAuthProvider()
provider.addScope('profile')
provider.addScope('email')
const deviceCol = collection(db, 'Device')

const familyMember = (email: string): boolean => {
  return nickInsteadEmail(email) != undefined
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
      allowPush: false,
      askPush: false,
    }
  },
  actions: {
    /**
     * Store user data in the User collection in Firestore and update local state.
     *
     * @param {User} user - Firebase user object.
     * @return {Promise<void>} Promise that resolves when the user data is stored.
     */
    async storeUser(user: User): Promise<void> {
      this.user = {
        name: user.displayName || '',
        email: user.email || '',
        uid: user.uid,
        isAuthorized: Boolean(familyMember(user.email as string)), // only family members
        isAdmin: Boolean(adminMember(user.email as string, user.uid as string)),
        signedIn: new Date(),
      }
      const userRef = doc(db, 'User', user.uid)
      await setDoc(userRef, this.user, { merge: true })

      const subscriberRef = doc(db, 'Subscriber', user.uid)
      const snap = await getDoc(subscriberRef)
      if (snap.exists()) {
        const subscriber = snap.data() as SubscriberType
        this.allowPush = subscriber.allowPush
        const diff = +new Date() - subscriber.timestamp.seconds * 1000
        if (diff > CONFIG.loginDays * 86400000) {
          this.askPush = true
        }
      } else {
        this.askPush = true
      }
    },

    /**
     * Sign in the user.
     *
     * If the user is currently signed in, signs them out and sets the user to null.
     * If the user is currently not signed in, signs in the user with Google.
     *
     * @return {Promise<void>} Promise that resolves when the user is signed in or signed out.
     */
    async signIn(): Promise<void> {
      if (this.user && this.user.uid) {
        await auth.signOut()
        this.user = null
        this.askPush = false
        this.allowPush = false
        // const routeName = router.currentRoute.value.name
        // if (routeName === 'add' || routeName === 'admin') {
        router.push({ name: 'home' })
      } else {
        try {
          const result = await signInWithPopup(getAuth(), provider)
          if (process.env.DEV) console.log(`Auth user: ${result.user.displayName}`)
        } catch (err) {
          console.error(err)
        }
      }
    },
    /**
     * Update the user's data in Firestore.
     *
     * Updates the user's data in Firestore if the user object is not null.
     *
     * @return {Promise<void>} Promise that resolves when the user's data is updated.
     */
    async updateUser(): Promise<void> {
      const docRef = doc(db, 'User', this.user!.uid)
      if (this.user) {
        await updateDoc(docRef, this.user)
      }
    },
    /**
     * Update the user's data in the Subscriber collection in Firestore.
     *
     * Updates the user's data in Firestore if the user object is not null.
     * If the user's data already exists, updates the allowPush and timestamp fields.
     * If not, sets the email, allowPush, and timestamp fields.
     *
     * @return {Promise<void>} Promise that resolves when the user's data is updated.
     */
    async updateSubscriber(): Promise<void> {
      const docRef = doc(db, 'Subscriber', this.user!.uid)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        await updateDoc(docRef, {
          allowPush: this.allowPush,
          timestamp: Timestamp.fromDate(new Date()),
        })
      } else {
        await setDoc(docRef, {
          email: this.user!.email,
          allowPush: this.allowPush,
          timestamp: Timestamp.fromDate(new Date()),
        })
      }
    },
    /**
     * Update the user's device token in Firestore.
     *
     * Updates the user's device token in Firestore with the given token.
     * The token is associated with the user's email and a timestamp.
     *
     * @param {string} token - The new device token to associate with the user.
     * @return {Promise<void>} Promise that resolves when the device token is updated.
     */
    async updateDevice(token: string): Promise<void> {
      const docRef = doc(db, 'Device', token)
      const data: { email: string; stamp: Date } = {
        email: this.user!.email,
        stamp: new Date(),
      }
      await setDoc(docRef, data, { merge: true })
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
        this.deleteQueryBatch(db, query, resolve)
      })
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}
