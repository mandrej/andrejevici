import type { StateCreator } from 'zustand'
import type { AppStore, UiSliceState, UiSliceActions } from './types'

const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  if (theme === 'auto') {
    const hour = new Date().getHours()
    const isNight = hour < 7 || hour >= 19
    root.classList.add(isNight ? 'dark' : 'light')
  } else {
    root.classList.add(theme)
  }
}

export const createUiSlice: StateCreator<AppStore, [], [], UiSliceState & UiSliceActions> = (
  set,
  get,
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
  progressInfo: {},

  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
  setShowEdit: (showEdit) => set({ showEdit }),
  setShowConfirm: (showConfirm) => set({ showConfirm }),
  setShowCarousel: (showCarousel) => set({ showCarousel }),
  setAdminTab: (adminTab) => set({ adminTab }),
  setAddTab: (addTab) => set({ addTab }),
  setMetaTab: (metaTab) => set({ metaTab }),
  setProgressInfo: (progressInfo) => set({ progressInfo }),

  setTheme: (theme) => {
    set({ theme })
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme)
      applyTheme(theme)
    }
  },

  initTheme: () => {
    if (typeof window !== 'undefined') {
      const persistedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null
      const activeTheme = persistedTheme || get().theme || 'auto'
      if (activeTheme !== get().theme) {
        set({ theme: activeTheme })
      }
      applyTheme(activeTheme)
    }
  },
})
