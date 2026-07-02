import { ref } from 'vue'

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
  actions?: Array<{ icon?: string; color?: string; handler?: () => void }>
}

export interface Toast extends NotifyOptions {
  id: number
  _timer?: ReturnType<typeof setTimeout>
}

let _nextId = 0

export const toasts = ref<Toast[]>([])

/**
 * Creates and shows a toast notification.
 */
export function useNotify() {
  const show = (options: NotifyOptions) => {
    const id = _nextId++
    const timeout = options.timeout ?? 5000
    const toast: Toast = { ...options, id }
    toasts.value.push(toast)

    if (timeout > 0) {
      toast._timer = setTimeout(() => dismiss(id), timeout)
    }
  }

  const dismiss = (id: number) => {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      const toast = toasts.value[idx]
      if (toast._timer) clearTimeout(toast._timer)
      toasts.value.splice(idx, 1)
    }
  }

  return { show, dismiss, toasts }
}
