import type { User } from 'firebase/auth'
import type { DeviceType, MyUserType, UsersAndDevices } from '@/helpers/models'

export interface AuthSliceState {
  user: MyUserType | null
  isFreshLogin: boolean
  initialized: boolean
}

export interface AuthSliceActions {
  storeUser: (user: User) => Promise<void>
  signIn: () => Promise<void>
  clearAuth: () => void
}

export interface NotificationsSliceState {
  token: string | null
  allowPush: boolean
  askPush: boolean
}

export interface NotificationsSliceActions {
  refreshToken: () => Promise<void>
  enableNotifications: () => Promise<void>
  disableNotifications: () => Promise<void>
  updateSubscriber: () => Promise<void>
  updateDevice: (token: string) => Promise<void>
  removeDevice: () => Promise<void>
}

export interface UsersAdminSliceActions {
  fetchUsers: () => Promise<MyUserType[]>
  getNickByEmail: (email: string) => Promise<string>
  fetchDevices: () => Promise<DeviceType[]>
  fetchUsersAndDevices: () => Promise<UsersAndDevices[]>
  deleteUser: (uid: string) => Promise<void>
  updateUser: (user: UsersAndDevices, field: keyof UsersAndDevices) => Promise<void>
}

export type UserStore = AuthSliceState &
  AuthSliceActions &
  NotificationsSliceState &
  NotificationsSliceActions &
  UsersAdminSliceActions
