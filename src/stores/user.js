import { defineStore } from "pinia";
import { CONFIG } from "../helpers";
import { auth, db } from "../boot/fire";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";
import router from "../router";

const messaging = getMessaging();
const provider = new GoogleAuthProvider();
// provider.addScope("https://www.googleapis.com/auth/userinfo.profile");

const deviceCol = collection(db, "Device");

const familyMember = (email) => {
  return CONFIG.family.find((el) => el === email);
};
const adminMember = (email) => {
  return CONFIG.admins.find((el) => el === email);
};

export const useUserStore = defineStore("auth", {
  state: () => ({
    user: {},
    token: null,
  }),
  actions: {
    getCurrentUser() {
      return new Promise((resolve, reject) => {
        const unsubscribe = getAuth().onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        }, reject);
      });
    },
    checkSession() {
      this.getCurrentUser().then((currentUser) => {
        if (this.user && this.user.uid && currentUser === null) this.signIn();
      });
      onAuthStateChanged(getAuth(), async (user) => {
        if (user) {
          const docRef = doc(db, "User", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            this.user = {
              name: user.displayName,
              email: user.email,
              uid: user.uid,
              isAuthorized: Boolean(familyMember(user.email)), // only family members
              isAdmin: Boolean(adminMember(user.email)),
              signedIn: 1 * user.metadata.lastLoginAt, // millis
              ask_push: data.allow_push ? false : true,
              allow_push: this.token ? true : false,
              token: data.token || "no",
            };
          } else {
            this.user = {
              name: user.displayName,
              email: user.email,
              uid: user.uid,
              isAuthorized: Boolean(familyMember(user.email)), // only family members
              isAdmin: Boolean(adminMember(user.email)),
              signedIn: 1 * user.metadata.lastLoginAt, // millis
              ask_push: true,
              allow_push: false,
            };
          }
          await setDoc(docRef, this.user, { merge: true });
        } else {
          this.signIn();
        }
      });
    },
    signIn() {
      if (this.user && this.user.uid) {
        auth.signOut().then(() => {
          this.user = {};
          const routeName = router.currentRoute.value.name;
          if (routeName === "add" || routeName === "admin") {
            router.push({ name: "home" });
          }
        });
      } else {
        signInWithPopup(getAuth(), provider)
          .then(() => {})
          .catch((err) => {
            console.error(err.message);
          });
      }
    },
    async updateUser() {
      const docRef = doc(db, "User", this.user.uid);
      await updateDoc(docRef, this.user);
    },
    async updateDevice() {
      const docRef = doc(db, "Device", this.token);
      const data = {
        email: this.user.email,
        stamp: new Date(),
      };
      await setDoc(docRef, data, { merge: true });
    },
    async removeDevice() {
      const q = query(deviceCol, where("email", "==", this.user.email));
      return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
      });
    },
    async deleteQueryBatch(db, query, resolve) {
      const snapshot = await query.get();
      const batchSize = snapshot.size;
      if (batchSize === 0) {
        resolve();
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
      });
    },
    async fetchFCMToken() {
      try {
        const token = await getToken(messaging, {
          vapidKey: CONFIG.firebase.vapidKey,
        });
        if (token) {
          this.token = token;
          this.updateDevice();

          this.user.ask_push = false;
          this.user.allow_push = true;
          this.updateUser();
        }
      } catch (err) {
        this.token = null;
        this.user.ask_push = true;
        this.user.allow_push = false;
        this.updateUser();
        console.error("Unable to retrieve token ", err);
      }
    },
  },
  persist: {
    key: "b",
    paths: ["user", "token"],
  },
});
