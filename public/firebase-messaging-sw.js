/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBHV3J3GAEPiTU2MCrhuRI4F9mWzdjw6B0",
  authDomain: "andrejevici.firebaseapp.com",
  databaseURL: "https://andrejevici.firebaseio.com",
  projectId: "andrejevici",
  storageBucket: "andrejevici.appspot.com",
  messagingSenderId: "183441678976",
  appId: "1:183441678976:web:3f87f36ff673545d3fbc65",
  vapidKey:
    "BE-lcnFeuNrGrGTRAYpUl-yk58mkWck-H-X5XzXSxg1HihPNhes8_V-GYDcWYwiOMCll08MpdoOcoULHudN0jIs",
});
const messaging = firebase.messaging();
