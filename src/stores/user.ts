import { defineStore, acceptHMRUpdate } from 'pinia'
import { nextTick } from 'vue'
import { CONFIG } from '../helpers'
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
} from 'firebase/firestore'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import router from '../router'
import type { User, UserCredential, AuthError } from 'firebase/auth'
import type { MyUserType } from '../helpers/models'
import type { Firestore, Query } from '@firebase/firestore'

const provider = new GoogleAuthProvider()
// provider.addScope("https://www.googleapis.com/auth/userinfo.profile");
const deviceCol = collection(db, 'Device')

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
  } {
    return {
      user: null,
      token: null,
    }
  },
  getters: {
    showConsent: (state: { user: MyUserType | null; token: string | null }): boolean => {
      return Boolean(
        'Notification' in window && state.user && state.user.allowPush && state.user.askPush,
      )
    },
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

      const docRef = doc(db, 'User', user.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as MyUserType
        if (!data.allowPush) {
          this.user.allowPush = true
        } else {
          this.user.allowPush = data.allowPush // preserve old
        }
      } else {
        this.user.allowPush = true
      }

      this.user.askPush = this.token ? false : true
      await setDoc(docRef, this.user, { merge: true })
    },

    /**
     * Sign in the user.
     *
     * If the user is currently signed in, signs them out and sets the user to null.
     * If the user is currently not signed in, signs in the user with Google.
     *
     * @return {Promise<void>} Promise that resolves when the user is signed in or signed out.
     */
    signIn(): Promise<void> {
      if (this.user && this.user.uid) {
        return auth.signOut().then(() => {
          this.user = null
          // const routeName = router.currentRoute.value.name
          // if (routeName === 'add' || routeName === 'admin') {
          router.push({ name: 'home' })
          // }
        })
      } else {
        return signInWithPopup(getAuth(), provider)
          .then((result: UserCredential) => {
            if (process.env.DEV) console.log(`Auth user: ${result.user.displayName}`)
          })
          .catch((err: AuthError) => {
            console.error(err.message)
          })
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
