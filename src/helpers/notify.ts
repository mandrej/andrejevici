import { toasts } from '../composables/useNotify'
import type { NotifyOptions, Toast } from '../composables/useNotify'

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

  // Deduplicate by group key
  if (group) {
    const existing = toasts.value.find((t) => t.group === group)
    if (existing) {
      if (existing._timer) {
        clearTimeout(existing._timer)
        delete existing._timer
      }
      Object.assign(existing, {
        type,
        message,
        caption,
        icon,
        timeout,
        spinner,
        html,
        multiLine,
        position,
        actions,
        _textColor,
      })
      if (timeout > 0) {
        existing._timer = setTimeout(() => {
          const idx = toasts.value.findIndex((t) => t.id === existing.id)
          if (idx !== -1) toasts.value.splice(idx, 1)
        }, timeout)
      }
      return
    }
  }

  let _nextId = toasts.value.length > 0 ? Math.max(...toasts.value.map((t) => t.id)) + 1 : 0

  const toast: Toast = {
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
    toast._timer = setTimeout(() => {
      const idx = toasts.value.findIndex((t) => t.id === toast.id)
      if (idx !== -1) toasts.value.splice(idx, 1)
    }, timeout)
  }
}
