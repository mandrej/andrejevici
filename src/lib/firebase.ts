import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getMessaging, onMessage } from 'firebase/messaging'
// import { getAnalytics } from "firebase/analytics";
import { CONFIG } from '../helpers'

const firebaseApp = initializeApp(CONFIG.firebase)
const auth = getAuth(firebaseApp)
const storage = getStorage(firebaseApp)
const db = getFirestore(firebaseApp)
const functions = getFunctions(firebaseApp)
const messaging = getMessaging(firebaseApp)

if (typeof location !== 'undefined' && location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

const messageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload)
    })
  })

export { auth, db, storage, functions, messaging, messageListener }
