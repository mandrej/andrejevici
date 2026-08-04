import type { StateCreator } from 'zustand'
import CONFIG from '@/config'
import { auth, logAnalyticsEvent } from '@/firebase'
import { doc, setDoc, getDoc, getDocs, query, Timestamp, limit } from 'firebase/firestore'
import { signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth'
import type { MyUserType } from '@/helpers/models'
import notify from '@/helpers/notify'
import { userCollection } from '@/helpers/collections'
import { dummy, formatDatum } from '@/helpers'
import type { UserStore, AuthSliceState, AuthSliceActions } from '@/stores/user/types'

const provider = new GoogleAuthProvider()
provider.addScope('profile')
provider.addScope('email')

export let resolveAuthReady!: () => void
export const authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve
})

export const createAuthSlice: StateCreator<UserStore, [], [], AuthSliceState & AuthSliceActions> = (
  set,
  get,
) => ({
  user: null,
  isFreshLogin: false,
  initialized: false,

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
        initialized: true,
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
        initialized: true,
      })
    }

    const currentUser = get().user
    if (currentUser) {
      await setDoc(userRef, currentUser, { merge: true })
    }
    resolveAuthReady()
  },

  signIn: async () => {
    const currentUser = get().user
    if (currentUser?.uid) {
      await auth.signOut()
      get().clearAuth()
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

  clearAuth: () => {
    set({
      user: null,
      token: null,
      allowPush: false,
      askPush: false,
      initialized: true,
    })
  },
})
