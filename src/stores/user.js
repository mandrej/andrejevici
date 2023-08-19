import { defineStore } from "pinia";
import { CONFIG } from "../helpers";
import { auth, db } from "../boot/fire";
import {
  doc,
  collection,
  query,
  where,
  limit,
  orderBy,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  getIdToken,
  onAuthStateChanged,
} from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";
import router from "../router";

const usersCol = collection(db, "User");
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
  }),
  actions: {
    checkSession() {
      onAuthStateChanged(getAuth(), (user) => {
        if (user) {
          getIdToken(user, true)
            .then(async (token) => {
              const payload = {
                name: user.displayName,
                email: user.email,
                uid: user.uid,
                isAuthorized: Boolean(familyMember(user.email)), // only family members
                isAdmin: Boolean(adminMember(user.email)),
                lastLoginAt: 1 * user.metadata.lastLoginAt, // millis
              };
              this.user = { ...payload };
              await setDoc(
                doc(db, "User", this.user.uid),
                {
                  email: this.user.email,
                  signedIn: this.user.lastLoginAt,
                },
                { merge: true }
              );
            })
            .catch((error) => {
              console.log(error.code);
              this.signIn();
            });
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
          .then((result) => {})
          .catch((err) => {
            console.error(err.message);
          });
      }
    },
    fetchFCMToken(permission) {
      if (permission === "granted") {
        return getToken(messaging, { vapidKey: CONFIG.firebase.vapidKey })
          .then(async (token) => {
            if (token) {
              if (this.fcm_token === null || token !== this.fcm_token) {
                this.fcm_token = token;
                if (this.user && this.user.uid) {
                  await setDoc(
                    doc(db, "User", this.user.uid),
                    {
                      token: this.fcm_token,
                    },
                    { merge: true }
                  );
                }
              }
            }
          })
          .catch(function (err) {
            console.error("Unable to retrieve token ", err);
          });
      }
    },
    // async subscribers() {
    //   const q = query(usersCol, where(token, ">", ""));
    //   const snapshot = await getDocs(q);
    //   for (const user of snapshot) {
    //     console.log(user.data());
    //   }
    // },
  },
  persist: {
    key: "b",
    paths: ["user", "fcm_token"],
  },
});
