import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createUiSlice } from './app/createUiSlice'
import { createRecordsSlice } from './app/createRecordsSlice'
import { createPhotoOpsSlice } from './app/createPhotoOpsSlice'
import type { AppStore } from './app/types'

export type { AppStore }

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createUiSlice(...a),
      ...createRecordsSlice(...a),
      ...createPhotoOpsSlice(...a),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        lastRecord: state.lastRecord,
        find: state.find,
        uploaded: state.uploaded,
        adminTab: state.adminTab,
        addTab: state.addTab,
        metaTab: state.metaTab,
        theme: state.theme,
      }),
    },
  ),
)
