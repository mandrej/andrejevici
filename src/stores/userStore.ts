import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createAuthSlice, authReady, resolveAuthReady } from '@/stores/user/createAuthSlice'
import { createNotificationsSlice } from '@/stores/user/createNotificationsSlice'
import { createUsersAdminSlice } from '@/stores/user/createUsersAdminSlice'
import type { UserStore } from '@/stores/user/types'

export { authReady, resolveAuthReady }
export type { UserStore }

export const useUserStore = create<UserStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createNotificationsSlice(...a),
      ...createUsersAdminSlice(...a),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user ? { uid: state.user.uid } : null,
        token: state.token,
      }),
    },
  ),
)
