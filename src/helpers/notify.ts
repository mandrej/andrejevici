import { Notify } from 'quasar'
import type { QNotifyOptions } from 'quasar'

const darkTextTypes = new Set(['info', 'warning', 'positive'])

/**
 * Sends a notification to the user.
 *
 * @param {QNotifyOptions} options - The options for the notification.
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
}: QNotifyOptions) {
  const textColor = darkTextTypes.has(type) ? 'dark' : 'white'
  for (const action of actions) {
    action.color = textColor
  }
  Notify.create({
    type,
    textColor,
    message,
    multiLine,
    timeout,
    spinner,
    group,
    html,
    position,
    actions,
    caption,
    icon,
  })
}
