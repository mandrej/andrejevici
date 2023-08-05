import { defineStore } from "pinia";
import { CONFIG } from "../helpers";
import { auth } from "../boot/fire";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import router from "../router";

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
const authorization = getAuth();

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
        signInWithPopup(authorization, provider)
          .then((result) => {
            const payload = {
              name: result.user.displayName,
              email: result.user.email,
              uid: result.user.uid,
              photo: result.user.photoURL,
              isAuthorized: Boolean(familyMember(result.user.email)), // only family members
              isAdmin: Boolean(adminMember(result.user.email)),
              lastLogin: Date.now(), // millis
            };
            this.user = { ...payload };
            // this.updateUser(this.user);
            // this.getPermission();
          })
          .catch((err) => {
            console.error(err.message);
          });
      }
    },
  },
  persist: {
    key: "b",
    paths: ["user", "fcm_token"],
  },
});
