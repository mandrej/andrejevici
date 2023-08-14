import { Notify } from "quasar";

export default function notify(options) {
  /**
   * type: 'positive', 'negative', 'warning', 'info', 'ongoing', 'external'
   */
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
  let {
    type,
    message,
    multiLine,
    timeout,
    spinner,
    group,
    html,
    position,
    actions,
  } = options;
  if (!message) return;
  Notify.create({
    type: type,
    message: message,
    multiLine: multiLine ? true : false,
    timeout: timeout,
    spinner: spinner ? true : false,
    group: group ? group : false,
    html: html ? true : false,
    position: position,
    actions: actions,
    textColor: type === "negative" ? "white" : "dark",
  });
}
