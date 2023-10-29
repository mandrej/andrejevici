import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
// import { getMessaging } from "firebase/messaging";
// import { getAnalytics } from "firebase/analytics";
import { CONFIG } from "../helpers";

const firebaseApp = initializeApp(CONFIG.firebase);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);
const db = getFirestore(firebaseApp);
// const messaging = getMessaging(firebaseApp);
// const analytics = getAnalytics(firebaseApp);

if (location.hostname === "localhost") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

navigator.serviceWorker
  .register("firebase-messaging-sw.js", {
    scope: "firebase-cloud-messaging-push-scope",
  })
  .then((registration) => {
    // console.log(registration);
  })
  .catch((err) => {
    console.log(err);
  });

export { auth, db, storage };
