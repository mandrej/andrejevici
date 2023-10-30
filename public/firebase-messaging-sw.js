import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";
import { onBackgroundMessage } from "firebase/messaging/sw";
import config from "../config";

const firebaseApp = initializeApp(config.firebase);
const messaging = getMessaging(firebaseApp);

onBackgroundMessage(messaging, (payload) => {
  // Customize notification here
  const title = payload.notification.title;
  const options = {
    body: payload.notification.body,
    icon: "/icons/favicon-32x32.png",
  };

  self.registration.showNotification(title, options);
});
