import type { StateCreator } from 'zustand'
import {
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import type { DeviceType, MyUserType, UsersAndDevices } from '../../helpers/models'
import notify from '../../helpers/notify'
import { deviceCollection, userCollection } from '../../helpers/collections'
import type { UserStore, UsersAdminSliceActions } from './types'

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
      await deleteDoc(doc(userCollection, uid))
      notify({ message: 'User deleted', icon: 'sym_r_delete' })
    } catch (err) {
      notify({
        type: 'negative',
        message: `Failed to delete user: ${String(err)}`,
      })
    }
  },

  updateUser: async (user: UsersAndDevices, field: keyof UsersAndDevices) => {
    const docRef = doc(userCollection, user.uid)
    try {
      await updateDoc(docRef, { [field]: user[field] })
      const value = user[field] as string | boolean
      notify({ message: `Updated ${String(field)} to ${value}`, icon: 'sym_r_check' })
    } catch (err) {
      notify({
        type: 'negative',
        message: `Failed to update ${String(field)}: ${String(err)}`,
      })
    }
  },
})
