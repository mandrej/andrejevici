import { defineStore } from "pinia";
import { nextTick } from "vue";
import { CONFIG } from "../helpers";
import notify from "../helpers/notify";
import { auth, db } from "../boot/fire";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
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
  getters: {
    showConsent: (state) => {
      return "Notification" in window && state.user && state.user.ask_push;
    },
  },
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
          this.user = {
            name: user.displayName,
            email: user.email,
            uid: user.uid,
            isAuthorized: Boolean(familyMember(user.email)), // only family members
            isAdmin: Boolean(adminMember(user.email)),
            signedIn: new Date(1 * user.metadata.lastLoginAt), // millis
          };

          const docRef = doc(db, "User", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            this.user.ask_push = data.allow_push ? false : true;
            this.user.allow_push = this.token ? true : false;
          } else {
            this.user.ask_push = true;
            this.user.allow_push = false;
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
    removeDevice() {
      const q = query(deviceCol, where("email", "==", this.user.email));
      return new Promise((resolve, reject) => {
        this.deleteQueryBatch(db, q, resolve).catch(reject);
      });
    },
    async deleteQueryBatch(db, query, resolve) {
      const querySnapshot = await getDocs(query);
      const batchSize = querySnapshot.size;
      if (batchSize === 0) {
        resolve();
        return;
      }

      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      nextTick(() => {
        this.deleteQueryBatch(db, query, resolve);
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
        // disable notification
        this.user.ask_push = false;
        this.user.allow_push = false;
        this.updateUser();
        notify({
          type: "negative",
          message: `Unable to retrieve token, ${err}`,
        });
      }
    },
  },
  persist: {
    key: "b",
    paths: ["user", "token"],
  },
});
