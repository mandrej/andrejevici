import { notify } from '../stores/toastStore'
import type { NotifyOptions } from '../stores/toastStore'

export default function notifyWrapper(options: NotifyOptions) {
  notify(options)
}
export type { NotifyOptions }
