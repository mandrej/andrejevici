/* eslint-disable no-undef */
// This file is imported into the Workbox-generated service worker via
// extendGenerateSWOptions > importScripts in quasar.config.ts.
// It must use importScripts (compat SDK) since ES module syntax is not
// supported in importScripts context.
importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: 'AIzaSyBHV3J3GAEPiTU2MCrhuRI4F9mWzdjw6B0',
  authDomain: 'andrejevici.firebaseapp.com',
  databaseURL: 'https://andrejevici.firebaseio.com',
  projectId: 'andrejevici',
  storageBucket: 'andrejevici.appspot.com',
  messagingSenderId: '183441678976',
  appId: '1:183441678976:web:3f87f36ff673545d3fbc65',
  measurementId: 'G-4HF1XHQ8Y6',
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

// Handle background push messages and show a notification.
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || 'ANDрејевићи'
  const options = {
    body: payload.data?.body || '',
    icon: '/icons/favicon-32x32.png',
    data: { link: payload.data?.link || '/' },
  }
  self.registration.showNotification(title, options)
})

// Handle notification clicks — must be top-level, not nested inside onBackgroundMessage.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if already open
      for (const client of clientList) {
        if (client.url === link && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(link)
      }
    }),
  )
})
