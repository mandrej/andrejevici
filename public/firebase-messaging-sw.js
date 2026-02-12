/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.FIREBASE_DATABASE_URL || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  ...(process.env.FIREBASE_APP_ID ? { appId: process.env.FIREBASE_APP_ID } : {}),
  ...(process.env.FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.FIREBASE_MEASUREMENT_ID }
    : {}),
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  // Customize notification here
  const title = payload.data.title
  const options = {
    body: payload.data.body,
    icon: '/icons/favicon-32x32.png',
  }

  self.registration.showNotification(title, options)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  self.addEventListener('notificationclick', function (event) {
    clients.openWindow(payload.data.link)
  })
})
