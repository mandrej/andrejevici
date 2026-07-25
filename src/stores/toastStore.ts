import { create } from 'zustand'
import { createToastSlice } from './toast/createToastSlice'
import type { ToastStore, NotifyOptions, Toast } from './toast/types'

export type { NotifyOptions, Toast, ToastStore }

export const useToastStore = create<ToastStore>()((...a) => ({
  ...createToastSlice(...a),
}))

// Export a legacy/compatible notify wrapper for direct imports
export const notify = (options: NotifyOptions) => {
  useToastStore.getState().show(options)
}
