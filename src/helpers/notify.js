import { CONFIG } from "./index";
import { Notify } from "quasar";

export default function notify(options) {
  /**
   * type: 'positive', 'negative', 'warning', 'info', 'ongoing', 'external'
   */
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
  let { type, message, multiLine, timeout, spinner, group, position } = options;
  if (!message) return;
  if (
    message.startsWith(CONFIG.start_message) ||
    message.startsWith(CONFIG.end_message)
  ) {
    timeout = 0;
  }
  Notify.create({
    type: type ? type : "info",
    message: message,
    multiLine: multiLine ? true : false,
    timeout: timeout ? timeout : 5000,
    spinner: spinner ? true : false,
    group: group ? group : false,
    position: position ? position : "bottom",
    textColor: "white",
    actions: [{ icon: "close", color: "white" }],
  });
}
