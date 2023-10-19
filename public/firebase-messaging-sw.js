const { initializeApp } = require("firebase/app");
const { getMessaging, onBackgroundMessage } = require("firebase/messaging/sw");
const config = require("../config.json");

const firebaseApp = initializeApp(config.firebase);
const messaging = getMessaging(firebaseApp);

onBackgroundMessage(messaging, (payload) => {
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: image || "icons/favicon-32x32.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
