import type { StateCreator } from 'zustand'
import { auth, db } from '@/firebase'
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import type { MyUserType, UsersAndDevices } from '@/helpers/models'
import notify from '@/helpers/notify'
import { photoCollection, userCollection } from '@/helpers/collections'
import type { UserStore, UsersAdminSliceActions } from '@/stores/user/types'

export const createUsersAdminSlice: StateCreator<UserStore, [], [], UsersAdminSliceActions> = (
  _set,
  get,
) => ({
  fetchUsers: async () => {
    const snapshot = await getDocs(query(userCollection, orderBy('email', 'asc')))
    return snapshot.docs.map((d) => {
      const data = d.data() as MyUserType
      return {
        ...data,
        id: data.id || d.id || data.email,
      }
    })
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

  fetchUsersAndDevices: async () => {
    const [snapshot, users] = await Promise.all([
      getDocs(collectionGroup(db, 'Device')),
      get().fetchUsers(),
    ])

    const sortedDocs = [...snapshot.docs].sort((a, b) => {
      const tA = (a.data() as { timestamp?: Timestamp }).timestamp?.toMillis() ?? 0
      const tB = (b.data() as { timestamp?: Timestamp }).timestamp?.toMillis() ?? 0
      return tB - tA
    })

    const deviceMap = new Map<string, Timestamp[]>()
    for (const d of sortedDocs) {
      const email = d.ref.parent.parent?.id
      if (!email) continue
      const normEmail = email.trim().toLowerCase()
      const data = d.data() as { timestamp: Timestamp }
      const list = deviceMap.get(normEmail)
      if (list) {
        list.push(data.timestamp)
      } else {
        deviceMap.set(normEmail, [data.timestamp])
      }
    }

    return users.map((user) => {
      const normEmail = user.email?.trim().toLowerCase()
      return {
        ...user,
        timestamps: (normEmail ? deviceMap.get(normEmail) : undefined) ?? [],
      }
    })
  },

  deleteUser: async (id: string) => {
    try {
      const userRef = doc(userCollection, id)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const u = userSnap.data() as MyUserType
        const email = u.email?.trim().toLowerCase()
        const nick = u.nick?.trim().toLowerCase()
        if (email || nick) {
          let hasContribution = false
          if (email) {
            const emailSnap = await getDocs(
              query(photoCollection, where('email', '==', u.email!.trim()), limit(1)),
            )
            if (!emailSnap.empty) hasContribution = true
          }
          if (!hasContribution && nick) {
            const nickSnap = await getDocs(
              query(photoCollection, where('nick', '==', u.nick!.trim()), limit(1)),
            )
            if (!nickSnap.empty) hasContribution = true
          }
          if (hasContribution) {
            throw new Error('Cannot delete a user with contributions')
          }
        }
      }
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
    const docRef = doc(userCollection, user.id)
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
              query(photoCollection, where('email', '==', user.email!.trim()), limit(1)),
            )
            if (!emailSnap.empty) hasContribution = true
          }
          if (!hasContribution && currentNick) {
            const currentData = currentSnap.data() as MyUserType | undefined
            const originalNick = currentData?.nick?.trim()
            if (originalNick) {
              const nickSnap = await getDocs(
                query(photoCollection, where('nick', '==', originalNick), limit(1)),
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
      const userRef = doc(userCollection, targetUser.id)
      await updateDoc(userRef, {
        timestamp: Timestamp.fromMillis(0),
      })

      if (targetUser.email) {
        const email = targetUser.email.trim().toLowerCase()
        const deviceSubcollection = collection(db, 'User', email, 'Device')
        let snapshot = await getDocs(deviceSubcollection)
        while (!snapshot.empty) {
          const batch = writeBatch(db)
          snapshot.forEach((d) => batch.delete(d.ref))
          await batch.commit()
          if (snapshot.size < 500) break
          snapshot = await getDocs(deviceSubcollection)
        }
      }

      const currentUser = get().user
      if (currentUser?.id === targetUser.id) {
        await auth.signOut()
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
