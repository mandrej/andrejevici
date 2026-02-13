/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js')

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
