import type { StateCreator } from 'zustand'
import type { ToastStore, ToastSliceState, ToastSliceActions, Toast } from './types'

const darkTextTypes = new Set(['info', 'warning', 'positive'])

export const createToastSlice: StateCreator<
  ToastStore,
  [],
  [],
  ToastSliceState & ToastSliceActions
> = (set, get) => ({
  toasts: [],
  show: (options) => {
    const type = options.type ?? 'info'
    const message = options.message ?? 'no message'
    const timeout = options.timeout ?? 5000
    const group = options.group ?? false
    const _textColor = darkTextTypes.has(type) ? 'dark' : 'white'

    set((state) => {
      const toastsList = [...state.toasts]

      // Deduplicate by group key
      if (group) {
        const existingIdx = toastsList.findIndex((t) => t.group === group)
        if (existingIdx !== -1) {
          const existing = toastsList[existingIdx]
          if (existing._timer) {
            clearTimeout(existing._timer)
          }

          const updatedToast: Toast = {
            ...existing,
            ...options,
            type,
            message,
            _textColor,
          }

          if (timeout > 0) {
            updatedToast._timer = setTimeout(() => get().dismiss(updatedToast.id), timeout)
          }

          toastsList[existingIdx] = updatedToast
          return { toasts: toastsList }
        }
      }

      const id = toastsList.length > 0 ? Math.max(...toastsList.map((t) => t.id)) + 1 : 0
      const toast: Toast = {
        ...options,
        id,
        type,
        message,
        _textColor,
      }

      if (timeout > 0) {
        toast._timer = setTimeout(() => get().dismiss(id), timeout)
      }

      return { toasts: [...toastsList, toast] }
    })
  },
  dismiss: (id) => {
    set((state) => {
      const idx = state.toasts.findIndex((t) => t.id === id)
      if (idx !== -1) {
        const toast = state.toasts[idx]
        if (toast._timer) clearTimeout(toast._timer)
        return { toasts: state.toasts.filter((t) => t.id !== id) }
      }
      return state
    })
  },
})
