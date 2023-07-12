import api from "./api";
import notify from "./notify";

export default function pushMessage(recipients, msg) {
  api
    .post(
      "message/send",
      {
        recipients: recipients,
        message: msg,
      },
      { timeout: 0 }
    )
    .then((resp) => {
      /**
       * on message send: pushMessage  2 successfully sent, 1 failed
       * recalc bycket: pushMessage  projects/andsnews/messages/dbc730ff-9e70-4f37-b907-50644f489565 sent
       */
      if (process.env.DEV) console.log("pushMessage ", resp.data);
    })
    .catch((err) => {
      console.error(err);
      notify({ type: "negative", message: "Push message failed" });
    });
}
