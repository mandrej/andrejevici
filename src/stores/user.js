import { defineStore } from "pinia";
import { CONFIG } from "../helpers";
import { auth, db } from "../boot/fire";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
    fcm_token: null,
    ask_push: true,
    allow_push: false,
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
          const payload = {
            name: user.displayName,
            email: user.email,
            uid: user.uid,
            isAuthorized: Boolean(familyMember(user.email)), // only family members
            isAdmin: Boolean(adminMember(user.email)),
            signedIn: 1 * user.metadata.lastLoginAt, // millis
          };
          this.user = { ...payload };

          const docRef = doc(db, "User", payload.uid);
          await setDoc(
            docRef,
            {
              email: payload.email,
              signedIn: payload.signedIn,
            },
            { merge: true }
          );

          const docSnap = await getDoc(docRef);
          const data = docSnap.data();
          this.ask_push = data.ask_push || true;
          this.allow_push = data.allow_push || false;
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
    fetchFCMToken() {
      return getToken(messaging, { vapidKey: CONFIG.firebase.vapidKey })
        .then(async (token) => {
          if (token) {
            this.fcm_token = token;
            this.allow_push = true;
            await setDoc(
              doc(db, "User", this.user.uid),
              {
                token: token,
                ask_push: false,
                allow_push: true,
              },
              { merge: true }
            );
          }
        })
        .catch(function (err) {
          console.error("Unable to retrieve token ", err);
        });
    },
  },
  persist: {
    key: "b",
    paths: ["user", "fcm_token"],
  },
});
