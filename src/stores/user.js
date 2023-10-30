import { defineStore } from "pinia";
import { CONFIG } from "../helpers";
import { auth, db } from "../boot/fire";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
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
provider.addScope("https://www.googleapis.com/auth/contacts.readonly");

const familyMember = (email) => {
  return CONFIG.family.find((el) => el === email);
};
const adminMember = (email) => {
  return CONFIG.admins.find((el) => el === email);
};

export const useUserStore = defineStore("auth", {
  state: () => ({
    user: {},
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
              ask_push: data.ask_push || data.token !== "no" ? false : true,
              allow_push: data.allow_push || data.token !== "no" ? true : false,
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
              token: "no",
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
    async fetchFCMToken() {
      try {
        const token = await getToken(messaging, {
          vapidKey: CONFIG.firebase.vapidKey,
        });
        if (token) {
          this.user.token = token;
          this.user.ask_push = false;
          this.user.allow_push = true;
          await updateDoc(doc(db, "User", this.user.uid), {
            token: token,
            ask_push: false,
            allow_push: true,
          });
        }
      } catch (err) {
        this.user.token = "no";
        this.user.ask_push = true;
        this.user.allow_push = false;
        this.updateUser();
        console.error("Unable to retrieve token ", err);
      }
    },
    // TODO after service worker update User on snapshot change sync with this.user
  },
  persist: {
    key: "b",
    paths: ["user"],
  },
});
