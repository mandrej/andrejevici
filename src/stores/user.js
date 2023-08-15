import { defineStore } from "pinia";
import { CONFIG } from "../helpers";
import { auth } from "../boot/fire";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  getIdToken,
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
  }),
  actions: {
    checkSession() {
      onAuthStateChanged(getAuth(), (user) => {
        if (user) {
          getIdToken(user, true)
            .then((token) => {
              const payload = {
                name: user.displayName,
                email: user.email,
                uid: user.uid,
                isAuthorized: Boolean(familyMember(user.email)), // only family members
                isAdmin: Boolean(adminMember(user.email)),
                lastLoginAt: 1 * user.metadata.lastLoginAt, // millis
              };
              this.user = { ...payload };
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
          .then((result) => {
            // this.updateUser(this.user);
            // this.getPermission();
          })
          .catch((err) => {
            console.error(err.message);
          });
      }
    },
    fetchFCMToken(permission) {
      if (permission === "granted") {
        return getToken(messaging, { vapidKey: CONFIG.firebase.vapidKey })
          .then((token) => {
            if (token) {
              if (this.fcm_token === null || token !== this.fcm_token) {
                this.fcm_token = token;
                // if (this.user && this.user.uid) {
                //   this.addRegistration();
                // }
              }
            }
          })
          .catch(function (err) {
            console.error("Unable to retrieve token ", err);
          });
      }
    },
  },
  persist: {
    key: "b",
    paths: ["user", "fcm_token"],
  },
});
