importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js"
);

fetch("../config.json")
  .then((res) => {
    return res.json();
  })
  .then((data) => {
    firebase.initializeApp(data.firebase);
    const messaging = firebase.messaging();
  });
