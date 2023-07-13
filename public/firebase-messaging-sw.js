/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js"
);

firebase.initializeApp({});
const messaging = firebase.messaging();
