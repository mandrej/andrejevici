import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import CONFIG from "../../config.json";

const firebaseApp = initializeApp(CONFIG.firebase);
const storage = getStorage(firebaseApp);
const db = getFirestore(firebaseApp);

export { firebaseApp, storage, db };
