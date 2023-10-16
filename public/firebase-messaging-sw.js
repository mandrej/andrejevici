importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js"
);

fetch("../config.json")
  .then((res) => res.json())
  .then((data) => {
    firebase.initializeApp(data.firebase);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(
      ({ notification: { title, body, image } }) => {
        self.registration.showNotification(title, {
          body,
          icon: image || "/icons/favicon-32x32.png",
        });
      }
    );
  });

// import { initializeApp } from "firebase/app";
// import { getMessaging } from "firebase/messaging/sw";
// import { onBackgroundMessage } from "firebase/messaging/sw";

// fetch("../config.json")
//   .then((res) => res.json())
//   .then((data) => {
//     const firebaseApp = initializeApp(data.firebase);
//     const messaging = getMessaging(firebaseApp);

//     onBackgroundMessage(messaging, (payload) => {
//       // Customize notification here
//       const notificationTitle = payload.notification.title;
//       const notificationOptions = {
//         body: payload.notification.body,
//         icon: "icons/favicon-32x32.png",
//       };

//       self.registration.showNotification(
//         notificationTitle,
//         notificationOptions
//       );
//     });
//   });
