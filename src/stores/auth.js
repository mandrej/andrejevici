/* eslint-disable no-unused-vars */
import { defineStore } from "pinia";
import { CONFIG } from "../helpers";
import api from "../helpers/api";
import pushMessage from "../helpers/push";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";
import router from "../router";

const firebaseApp = initializeApp(CONFIG.firebase);
const auth = getAuth(firebaseApp);
const messaging = getMessaging();
const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");

const familyMember = (email) => {
  return CONFIG.family.find((el) => el === email);
};
const adminMember = (email) => {
  return CONFIG.admins.find((el) => el === email);
};

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: {},
    fcm_token: null,
  }),
  getters: {},
  actions: {
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
        signInWithPopup(auth, provider)
          .then((response) => {
            const payload = {
              name: response.user.displayName,
              email: response.user.email,
              uid: response.user.uid,
              photo: response.user.photoURL,
              isAuthorized: Boolean(familyMember(response.user.email)), // only family members
              isAdmin: Boolean(adminMember(response.user.email)),
              lastLogin: Date.now(), // millis
            };
            this.user = { ...payload };
            this.updateUser(this.user);
            this.getPermission();
          })
          .catch((err) => {
            console.error(err.message);
          });
      }
    },
    async updateUser(user) {
      const response = await api.post("user", { user: user });
      if (!response.data.success) {
        console.error("Cannot save user");
      }
    },
    getPermission() {
      try {
        Notification.requestPermission().then((permission) =>
          this.fetchToken(permission)
        );
      } catch (error) {
        // https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API
        Notification.requestPermission(function (permission) {
          this.fetchToken(permission);
        });
      }
    },
    fetchToken(permission) {
      if (permission === "granted") {
        return getToken(messaging, { vapidKey: CONFIG.firebase.vapidKey })
          .then((token) => {
            if (token) {
              if (this.fcm_token === null || token !== this.fcm_token) {
                this.fcm_token = token;
                if (this.user && this.user.uid) {
                  this.addRegistration();
                }
              }
            }
          })
          .catch(function (err) {
            console.error("Unable to retrieve token ", err);
          });
      }
    },
    addRegistration() {
      api
        .put("user/register", { uid: this.user.uid, token: this.fcm_token })
        .then()
        .catch((err) => console.error(err));
    },
    // eslint-disable-next-line no-unused-vars
    sendNotifications(msg) {
      api.get("registrations").then((response) => {
        pushMessage(response.data, msg);
      });
    },
  },
  persist: {
    key: "b",
    paths: ["user", "fcm_token"],
    // beforeRestore: (context) => {
    //   console.log("Before hydration...", context);
    // },
    // afterRestore: (context) => {
    //   console.log("After hydration...", context);
    // },
  },
});
