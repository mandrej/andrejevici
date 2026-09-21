import type { StateCreator } from 'zustand'
import { auth, db } from '@/firebase'
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
  writeBatch,
} from 'firebase/firestore'
import type { DeviceType, MyUserType, UsersAndDevices } from '@/helpers/models'
import notify from '@/helpers/notify'
import { deviceCollection, photoCollection, userCollection } from '@/helpers/collections'
import type { UserStore, UsersAdminSliceActions } from '@/stores/user/types'

export const createUsersAdminSlice: StateCreator<UserStore, [], [], UsersAdminSliceActions> = (
  _set,
  get,
) => ({
  fetchUsers: async () => {
    const snapshot = await getDocs(query(userCollection, orderBy('email', 'asc')))
    return snapshot.docs.map((d) => d.data() as MyUserType)
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

  fetchDevices: async () => {
    const snapshot = await getDocs(query(deviceCollection, orderBy('timestamp', 'desc')))
    return snapshot.docs.map((d) => ({ ...(d.data() as DeviceType), key: d.id }))
  },

  fetchUsersAndDevices: async () => {
    const [devices, users] = await Promise.all([get().fetchDevices(), get().fetchUsers()])

    const deviceMap = new Map<string, Timestamp[]>()
    for (const dev of devices) {
      const list = deviceMap.get(dev.email)
      if (list) {
        list.push(dev.timestamp)
      } else {
        deviceMap.set(dev.email, [dev.timestamp])
      }
    }

    return users.map((user) => ({
      ...user,
      timestamps: deviceMap.get(user.email) ?? [],
    }))
  },

  deleteUser: async (uid: string) => {
    try {
      const userRef = doc(userCollection, uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const u = userSnap.data() as MyUserType
        const email = u.email?.trim().toLowerCase()
        const nick = u.nick?.trim().toLowerCase()
        if (email || nick) {
          const photoSnap = await getDocs(query(photoCollection))
          const hasContribution = photoSnap.docs.some((d) => {
            const p = d.data()
            const pEmail = typeof p.email === 'string' ? p.email.trim().toLowerCase() : ''
            const pNick = typeof p.nick === 'string' ? p.nick.trim().toLowerCase() : ''
            return (email && pEmail === email) || (nick && pNick === nick)
          })
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
    const docRef = doc(userCollection, user.uid)
    try {
      if (field === 'nick') {
        const email = user.email?.trim().toLowerCase()
        const currentSnap = await getDoc(docRef)
        const currentNick = (currentSnap.data() as MyUserType | undefined)?.nick?.trim().toLowerCase()
        if (email || currentNick) {
          const photoSnap = await getDocs(query(photoCollection))
          const hasContribution = photoSnap.docs.some((d) => {
            const p = d.data()
            const pEmail = typeof p.email === 'string' ? p.email.trim().toLowerCase() : ''
            const pNick = typeof p.nick === 'string' ? p.nick.trim().toLowerCase() : ''
            return (email && pEmail === email) || (currentNick && pNick === currentNick)
          })
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
      const userRef = doc(userCollection, targetUser.uid)
      await updateDoc(userRef, {
        timestamp: Timestamp.fromMillis(0),
      })

      if (targetUser.email) {
        const q = query(deviceCollection, where('email', '==', targetUser.email))
        let snapshot = await getDocs(q)
        while (!snapshot.empty) {
          const batch = writeBatch(db)
          snapshot.forEach((d) => batch.delete(d.ref))
          await batch.commit()
          if (snapshot.size < 500) break
          snapshot = await getDocs(q)
        }
      }

      const currentUser = get().user
      if (currentUser?.uid === targetUser.uid) {
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
