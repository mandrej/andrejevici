import { Notify } from "quasar";

export default function notify(options) {
  /**
   * type: 'positive', 'negative', 'warning', 'info', 'ongoing', 'external'
   */
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
  let {
    type = "info",
    message = "testing",
    multiLine = false,
    timeout = 5000,
    spinner = false,
    group = false,
    html = false,
    position = "bottom",
    actions,
    caption,
    icon,
  } = options;
  if (!message) return;
  Notify.create({
    type: type,
    textColor:
      ["info", "warning", "positive"].indexOf(type) >= 0 ? "dark" : "white",
    message: message,
    multiLine,
    timeout,
    spinner,
    group,
    html,
    position,
    actions: actions,
    caption: caption,
    icon: icon,
  });
}
