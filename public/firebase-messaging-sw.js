importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js"
);

try {
  firebase.initializeApp({
    apiKey: "AIzaSyBHV3J3GAEPiTU2MCrhuRI4F9mWzdjw6B0",
    authDomain: "andrejevici.firebaseapp.com",
    databaseURL: "https://andrejevici.firebaseio.com",
    projectId: "andrejevici",
    storageBucket: "andrejevici.appspot.com",
    messagingSenderId: "183441678976",
    appId: "1:183441678976:web:3f87f36ff673545d3fbc65",
    measurementId: "G-4HF1XHQ8Y6",
  });
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log(payload);
    // Customize notification here
    const notificationTitle = payload.data.title;
    const notificationOptions = {
      body: payload.data.body,
      icon: payload.data.icon || "icons/favicon-32x32.png",
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // self.addEventListener("notificationclick", function (event) {
  //   clients.openWindow(payload.data.link);
  // });
} catch (error) {
  console.log(error);
}

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
