import { create } from 'zustand'

export interface NotifyOptions {
  type?: 'info' | 'warning' | 'positive' | 'negative' | 'ongoing' | 'external'
  message?: string
  caption?: string
  icon?: string
  timeout?: number
  spinner?: boolean
  group?: boolean | string
  html?: boolean
  multiLine?: boolean
  position?: string
  actions?: Array<{ label?: string; icon?: string; color?: string; handler?: () => void }>
}

export interface Toast extends NotifyOptions {
  id: number
  _timer?: ReturnType<typeof setTimeout>
  _textColor?: 'dark' | 'white'
}

interface ToastStore {
  toasts: Toast[]
  show: (options: NotifyOptions) => void
  dismiss: (id: number) => void
}

const darkTextTypes = new Set(['info', 'warning', 'positive'])

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  show: (options) => {
    const type = options.type ?? 'info'
    const message = options.message ?? 'no message'
    const timeout = options.timeout ?? 5000
    const group = options.group ?? false
    const _textColor = darkTextTypes.has(type) ? 'dark' : 'white'

    set((state) => {
      let toastsList = [...state.toasts]

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
}))

// Export a legacy/compatible notify wrapper for direct imports
export const notify = (options: NotifyOptions) => {
  useToastStore.getState().show(options)
}
