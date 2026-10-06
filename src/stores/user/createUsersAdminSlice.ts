import type { StateCreator } from 'zustand'
import { auth } from '@/firebase'
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import type { MyUserType, UsersAndDevices } from '@/helpers/models'
import notify from '@/helpers/notify'
import { photoCollection, getUserDeviceCollection, userCollection } from '@/helpers/collections'
import { deleteUserDevices } from '@/helpers/devices'
import type { UserStore, UsersAdminSliceActions } from '@/stores/user/types'

export const createUsersAdminSlice: StateCreator<UserStore, [], [], UsersAdminSliceActions> = (
  _set,
  get,
) => ({
  fetchUsers: async () => {
    const snapshot = await getDocs(query(userCollection(), orderBy('email', 'asc')))
    return snapshot.docs.map((d) => {
      const data = d.data() as MyUserType
      return {
        ...data,
        id: data.id || d.id || data.email,
      }
    })
  },

  getNickByEmail: async (email: string) => {
    const q = query(userCollection(), where('email', '==', email), limit(1))
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

  fetchUsersAndDevices: async () => {
    const users = await get().fetchUsers()

    // Device tokens are documents in each user's own `Device` subcollection, so they are read
    // per user document rather than through a collection group query.
    const deviceLists = await Promise.all(
      users.map(async (user) => {
        const userDocId = user.id || user.email?.trim().toLowerCase()
        if (!userDocId) return [] as Timestamp[]
        try {
          const snapshot = await getDocs(getUserDeviceCollection(userDocId))
          return snapshot.docs.map(
            (d) => (d.data() as { timestamp?: Timestamp }).timestamp ?? Timestamp.fromMillis(0),
          )
        } catch (err) {
          // A user without any device simply has no `Device` subcollection.
          console.warn(`Failed to read devices for ${userDocId}:`, err)
          return [] as Timestamp[]
        }
      }),
    )

    return users.map((user, index) => ({
      ...user,
      timestamps: [...(deviceLists[index] ?? [])].sort((a, b) => b.toMillis() - a.toMillis()),
    }))
  },

  deleteUser: async (id: string) => {
    try {
      const userRef = doc(userCollection(), id)
      const userSnap = await getDoc(userRef)
      let userEmail = id.trim().toLowerCase()
      if (userSnap.exists()) {
        const u = userSnap.data() as MyUserType
        const email = u.email?.trim().toLowerCase()
        const nick = u.nick?.trim().toLowerCase()
        if (email) userEmail = email
        if (email || nick) {
          let hasContribution = false
          if (email) {
            const emailSnap = await getDocs(
              query(photoCollection(), where('email', '==', u.email!.trim()), limit(1)),
            )
            if (!emailSnap.empty) hasContribution = true
          }
          if (!hasContribution && nick) {
            const nickSnap = await getDocs(
              query(photoCollection(), where('nick', '==', u.nick!.trim()), limit(1)),
            )
            if (!nickSnap.empty) hasContribution = true
          }
          if (hasContribution) {
            throw new Error('Cannot delete a user with contributions')
          }
        }
      }
      // Remove the device tokens first: an orphaned token would keep receiving notifications.
      await deleteUserDevices(userEmail)
      await deleteDoc(userRef)
      notify({ message: 'User deleted', icon: 'sym_r_delete' })
    } catch (err) {
      notify({
        type: 'negative',
        message: `Failed to delete user: ${String(err)}`,
      })
      throw err
    }
  },

  updateUser: async (user: UsersAndDevices, field: keyof UsersAndDevices) => {
    const docRef = doc(userCollection(), user.id)
    try {
      if (field === 'nick') {
        const email = user.email?.trim().toLowerCase()
        const currentSnap = await getDoc(docRef)
        const currentNick = (currentSnap.data() as MyUserType | undefined)?.nick
          ?.trim()
          .toLowerCase()
        if (email || currentNick) {
          let hasContribution = false
          if (email) {
            const emailSnap = await getDocs(
              query(photoCollection(), where('email', '==', user.email!.trim()), limit(1)),
            )
            if (!emailSnap.empty) hasContribution = true
          }
          if (!hasContribution && currentNick) {
            const currentData = currentSnap.data() as MyUserType | undefined
            const originalNick = currentData?.nick?.trim()
            if (originalNick) {
              const nickSnap = await getDocs(
                query(photoCollection(), where('nick', '==', originalNick), limit(1)),
              )
              if (!nickSnap.empty) hasContribution = true
            }
          }
          if (hasContribution) {
            throw new Error('Cannot change nickname for a user with contributions')
          }
        }
      }
      await updateDoc(docRef, { [field]: user[field] })
      const value = user[field] as string | boolean
      notify({ message: `Updated ${String(field)} to ${value}`, icon: 'sym_r_check' })
    } catch (err) {
      notify({
        type: 'negative',
        message: `Failed to update ${String(field)}: ${String(err)}`,
      })
      throw err
    }
  },

  logoutUser: async (targetUser: UsersAndDevices) => {
    try {
      const userRef = doc(userCollection(), targetUser.id)
      await updateDoc(userRef, {
        timestamp: Timestamp.fromMillis(0),
      })

      if (targetUser.email) {
        // Logging a user out must also drop their device tokens, or they keep getting pushes.
        await deleteUserDevices(targetUser.email)
      }

      const currentUser = get().user
      if (currentUser?.id === targetUser.id) {
        await auth().signOut()
        get().clearAuth()
      }

      notify({ message: `Logged out ${targetUser.nick || targetUser.email}`, icon: 'logout' })
    } catch (err) {
      notify({
        type: 'negative',
        message: `Failed to log out user: ${String(err)}`,
      })
    }
  },
})
