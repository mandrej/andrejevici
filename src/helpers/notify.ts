import { toasts } from '../composables/useNotify'
import type { NotifyOptions } from '../composables/useNotify'

const darkTextTypes = new Set(['info', 'warning', 'positive'])

/**
 * Sends a notification to the user.
 *
 * @param {NotifyOptions} options - The options for the notification.
 * @return {void} This function does not return anything.
 */
export default function notify({
  type = 'info',
  message = 'no message',
  multiLine = false,
  timeout = 5000,
  spinner = false,
  group = false,
  html = false,
  position = 'bottom',
  actions = [],
  caption = '',
  icon = '',
}: NotifyOptions) {
  const _textColor = darkTextTypes.has(type) ? 'dark' : 'white'
  let _nextId = toasts.value.length > 0 ? Math.max(...toasts.value.map((t) => t.id)) + 1 : 0

  // Deduplicate by group key
  if (group) {
    const existing = toasts.value.find((t) => t.group === group)
    if (existing) {
      existing.message = message
      return
    }
  }

  const toast = {
    id: _nextId++,
    type,
    message,
    caption,
    icon,
    timeout,
    spinner,
    group,
    html,
    multiLine,
    position,
    actions,
    _textColor,
  }
  toasts.value.push(toast)

  if (timeout > 0) {
    setTimeout(() => {
      const idx = toasts.value.findIndex((t) => t.id === toast.id)
      if (idx !== -1) toasts.value.splice(idx, 1)
    }, timeout)
  }
}
