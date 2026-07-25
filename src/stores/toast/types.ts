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

export interface ToastSliceState {
  toasts: Toast[]
}

export interface ToastSliceActions {
  show: (options: NotifyOptions) => void
  dismiss: (id: number) => void
}

export type ToastStore = ToastSliceState & ToastSliceActions
