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
import type { userType } from '../components/models'
import type { Firestore, Query } from '@firebase/firestore'

const provider = new GoogleAuthProvider()
// provider.addScope("https://www.googleapis.com/auth/userinfo.profile");
const deviceCol = collection(db, 'Device')

// const timeStamp2Date = (ts) => {
//   const timeStamp = ts.seconds * 1000 + ts.nanoseconds / 1e6;
//   return new Date(timeStamp);
// };

const familyMember = (email: string): string | undefined => {
  return CONFIG.family.find((el: string) => el === email)
}
const adminMember = (email: string): string | undefined => {
  return CONFIG.admins.find((el: string) => el === email)
}

export const useUserStore = defineStore('auth', {
  state(): {
    user: userType | null
    token: string | null
  } {
    return {
      user: null,
      token: null,
    }
  },
  getters: {
    showConsent: (state: { user: userType | null; token: string | null }): boolean => {
      return Boolean(
        'Notification' in window && state.user && state.user.allowPush && state.user.askPush,
      )
    },
  },
  actions: {
    async storeUser(user: User): Promise<void> {
      this.user = {
        name: user.displayName || '',
        email: user.email || '',
        uid: user.uid,
        isAuthorized: Boolean(familyMember(user.email || '')), // only family members
        isAdmin: Boolean(adminMember(user.email || '')),
        signedIn: new Date(),
      }

      const docRef = doc(db, 'User', user.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as userType
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
    async updateUser(): Promise<void> {
      const docRef = doc(db, 'User', this.user!.uid)
      if (this.user) {
        await updateDoc(docRef, this.user)
      }
    },
    async updateDevice(token: string): Promise<void> {
      const docRef = doc(db, 'Device', token)
      const data: { email: string; stamp: Date } = {
        email: this.user!.email,
        stamp: new Date(),
      }
      await setDoc(docRef, data, { merge: true })
    },
    removeDevice(): Promise<void> {
      const q = query(deviceCol, where('email', '==', this.user?.email || ''))
      return new Promise((resolve, reject) => {
        this.deleteQueryBatch(db, q, resolve).catch(reject)
      })
    },

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
