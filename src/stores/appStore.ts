import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createUiSlice } from '@/stores/app/createUiSlice'
import { createRecordsSlice } from '@/stores/app/createRecordsSlice'
import { createPhotoOpsSlice } from '@/stores/app/createPhotoOpsSlice'
import type { AppStore } from '@/stores/app/types'

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
