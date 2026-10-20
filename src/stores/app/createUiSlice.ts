import type { StateCreator } from 'zustand'
import type { AppStore, UiSliceState, UiSliceActions } from '@/stores/app/types'

export const createUiSlice: StateCreator<AppStore, [], [], UiSliceState & UiSliceActions> = (
  set,
) => ({
  busy: false,
  error: '',
  showEdit: false,
  showConfirm: false,
  showCarousel: false,
  adminTab: 'repair',
  addTab: 'photo',
  metaTab: 'tags',
  theme: 'auto',

  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
  setShowEdit: (showEdit) => set({ showEdit }),
  setShowConfirm: (showConfirm) => set({ showConfirm }),
  setShowCarousel: (showCarousel) => set({ showCarousel }),
  setAdminTab: (adminTab) => set({ adminTab }),
  setAddTab: (addTab) => set({ addTab }),
  setMetaTab: (metaTab) => set({ metaTab }),

  setTheme: (theme) => set({ theme }),
  initTheme: () => {},
})
